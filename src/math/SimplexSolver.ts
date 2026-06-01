import { DualNumber } from "./DualNumber";

export interface Tableau {
  iteration: number;
  matrix: DualNumber[][];
  rhs: DualNumber[];
  zRow: DualNumber[];
  basisIndices: number[];
  varNames: string[];
  enteringVar?: number;
  leavingVar?: number;
  zValue: DualNumber;
  isOptimal: boolean;
  isInfeasible: boolean;
}

export class SimplexSolver {
  solve(
    c: DualNumber[],       // Коефіцієнти цільової функції (включаючи штрафи M)
    A: number[][],         // Матриця обмежень
    b: number[],           // Вільні члени
    basis: number[],       // Початкові індекси базису
    varNames: string[],    // Імена змінних
    artificialVars: number[] // Індекси штучних змінних для перевірки розв'язності
  ): Tableau[] {
    const steps: Tableau[] = [];
    let currentA = A.map(row => row.map(val => new DualNumber(val)));
    let currentB = b.map(val => new DualNumber(val));
    let currentBasis = [...basis];
    let iteration = 0;

    while (true) {
      // 1. Обчислення Z та оцінок (Z-рядка)
      let zValue = new DualNumber(0);
      for (let i = 0; i < currentBasis.length; i++) {
        zValue = zValue.add(c[currentBasis[i]].mul(currentB[i].r));
      }

      const zRow: DualNumber[] = [];
      for (let j = 0; j < c.length; j++) {
        let sum = new DualNumber(0);
        for (let i = 0; i < currentBasis.length; i++) {
          sum = sum.add(c[currentBasis[i]].mul(currentA[i][j].r));
        }
        zRow.push(c[j].sub(sum));
      }

      // 2. Перевірка на оптимальність
      let isOptimal = true;
      let enteringVar = -1;
      let minDelta = new DualNumber(0);

      for (let j = 0; j < zRow.length; j++) {
        if (zRow[j].isNegative()) {
          isOptimal = false;
          if (enteringVar === -1 || zRow[j].compareTo(minDelta) < 0) {
            enteringVar = j;
            minDelta = zRow[j];
          }
        }
      }

      // Перевірка на нерозв'язність (штучні змінні залишилися у базисі > 0)
      let isInfeasible = false;
      if (isOptimal) {
        for (let i = 0; i < currentBasis.length; i++) {
          if (artificialVars.includes(currentBasis[i]) && currentB[i].r > 1e-7) {
            isInfeasible = true;
          }
        }
      }

      // 3. Збереження кроку
      const currentTableau: Tableau = {
        iteration,
        matrix: currentA.map(row => [...row]),
        rhs: [...currentB],
        zRow: [...zRow],
        basisIndices: [...currentBasis],
        varNames,
        zValue,
        isOptimal,
        isInfeasible,
        enteringVar: isOptimal ? undefined : enteringVar,
      };

      if (isOptimal) {
        steps.push(currentTableau);
        break;
      }

      // 4. Пошук змінної, що виводиться (Тест мінімального відношення Theta)
      let leavingRow = -1;
      let minTheta = Infinity;

      for (let i = 0; i < currentB.length; i++) {
        const val = currentA[i][enteringVar].r;
        if (val > 1e-7) {
          const theta = currentB[i].r / val;
          if (theta < minTheta) {
            minTheta = theta;
            leavingRow = i;
          }
        }
      }

      if (leavingRow === -1) {
        throw new Error("Функція не обмежена. Розв'язку немає.");
      }

      currentTableau.leavingVar = currentBasis[leavingRow];
      steps.push(currentTableau);

      // 5. Крок Жордана-Гаусса
      const pivot = currentA[leavingRow][enteringVar].r;
      const nextA = currentA.map(row => row.map(() => new DualNumber(0)));
      const nextB = currentB.map(() => new DualNumber(0));

      for (let j = 0; j < c.length; j++) {
        nextA[leavingRow][j] = currentA[leavingRow][j].div(pivot);
      }
      nextB[leavingRow] = currentB[leavingRow].div(pivot);

      for (let i = 0; i < currentB.length; i++) {
        if (i === leavingRow) continue;
        const factor = currentA[i][enteringVar].r;
        for (let j = 0; j < c.length; j++) {
          nextA[i][j] = currentA[i][j].sub(nextA[leavingRow][j].mul(factor));
        }
        nextB[i] = currentB[i].sub(nextB[leavingRow].mul(factor));
      }

      currentA = nextA;
      currentB = nextB;
      currentBasis[leavingRow] = enteringVar;
      iteration++;
    }

    return steps;
  }
}