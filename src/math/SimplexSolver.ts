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
  explanation: string;
}

export class SimplexSolver {
  solve(
    c: DualNumber[],
    A: number[][],
    b: number[],
    basis: number[],
    varNames: string[],
    artificialVars: number[],
    isMax: boolean
  ): Tableau[] {
    const steps: Tableau[] = [];
    let currentA = A.map(row => row.map(val => new DualNumber(val)));
    let currentB = b.map(val => new DualNumber(val));
    let currentBasis = [...basis];
    let iteration = 0;

    while (true) {
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

      let isOptimal = true;
      let enteringVar = -1;
      let bestDelta = new DualNumber(0);

      for (let j = 0; j < zRow.length; j++) {
        if (isMax) {
          if (zRow[j].isPositive()) {
            isOptimal = false;
            if (enteringVar === -1 || zRow[j].compareTo(bestDelta) > 0) {
              enteringVar = j;
              bestDelta = zRow[j];
            }
          }
        } else {
          if (zRow[j].isNegative()) {
            isOptimal = false;
            if (enteringVar === -1 || zRow[j].compareTo(bestDelta) < 0) {
              enteringVar = j;
              bestDelta = zRow[j];
            }
          }
        }
      }

      let isInfeasible = false;
      if (isOptimal) {
        for (let i = 0; i < currentBasis.length; i++) {
          if (artificialVars.includes(currentBasis[i]) && currentB[i].r > 1e-7) {
            isInfeasible = true;
          }
        }
      }

      let leavingRow = -1;
      let minTheta = Infinity;
      const thetaStrings: string[] = [];

      if (!isOptimal) {
        for (let i = 0; i < currentB.length; i++) {
          const val = currentA[i][enteringVar].r;
          if (val > 1e-7) {
            const theta = currentB[i].r / val;
            thetaStrings.push(`для ${varNames[currentBasis[i]]} (${currentB[i].r.toFixed(0)} / ${val.toFixed(2)} = ${theta.toFixed(2)})`);
            if (theta < minTheta) {
              minTheta = theta;
              leavingRow = i;
            }
          }
        }
      }

      let explanation = "";
      if (iteration === 0) {
        explanation += `Оскільки цільова функція спрямована на ${isMax ? 'максимізацію, ми шукаємо найбільшу додатну' : "мінімізацію, ми шукаємо найбільшу від'ємну"} оцінку Δj в індексному рядку. Поточне значення функції Z = ${zValue.toString()}. `;
      } else {
        explanation += `Матрицю було перераховано за методом Жордана-Гаусса. Поточне значення цільової функції Z = ${zValue.toString()}. `;
      }

      if (isOptimal) {
        if (isInfeasible) {
          explanation += `\nКритерій оптимальності формально виконано (немає оцінок, що можуть покращити план), ПРОТЕ в базисі залишилася штучна змінна зі значенням, більшим за нуль. Це математичний доказ того, що система обмежень є несумісною.`;
        } else {
          explanation += `\nКритерій оптимальності повністю виконано, оскільки серед оцінок Δj більше немає ${isMax ? 'додатних' : "від'ємних"} значень. Штучні змінні відсутні або дорівнюють нулю. Алгоритм успішно знайшов оптимальний план!`;
        }
      } else {
        const entName = varNames[enteringVar];
        explanation += `\nКритерій оптимальності ще не виконано. Найбільший внесок у покращення розв'язку дає змінна ${entName} з оцінкою Δ = ${zRow[enteringVar].toString()}. Отже, ${entName} вводиться до базису. `;

        if (leavingRow !== -1) {
          const leavName = varNames[currentBasis[leavingRow]];
          const pivot = currentA[leavingRow][enteringVar].r.toFixed(2);
          explanation += `\nДалі проводимо θ-тест для знаходження змінної, яка звільнить місце: ${thetaStrings.join('; ')}. `;
          explanation += `Найменше відношення відповідає змінній ${leavName}, тому саме вона виводиться з базису. Напрямний розрізний елемент дорівнює ${pivot}.`;
        } else {
          explanation += `\nУвага: у напрямному стовпці немає додатних елементів. Це свідчить про те, що цільова функція є необмеженою на заданій множині.`;
          isOptimal = true;
        }
      }

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
        explanation,
        enteringVar: isOptimal ? undefined : enteringVar,
        leavingVar: leavingRow !== -1 ? currentBasis[leavingRow] : undefined,
      };

      steps.push(currentTableau);
      if (isOptimal) break;

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