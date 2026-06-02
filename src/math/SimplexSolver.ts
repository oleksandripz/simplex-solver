// імпортую свій клас для роботи з числами, що містять штучний штраф
import { DualNumber } from "./DualNumber";

// описую структуру даних для однієї ітерації (одного кроку таблиці)
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

// створюю головний клас, який буде математично розв'язувати задачу
export class SimplexSolver {
  // основна функція, яка приймає всі початкові дані і повертає масив кроків
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

    // роблю глибокі копії матриці та векторів, щоб під час розрахунків не зіпсувати оригінальні дані
    let currentA = A.map(row => row.map(val => new DualNumber(val)));
    let currentB = b.map(val => new DualNumber(val));
    let currentBasis = [...basis];
    let iteration = 0;

    // запускаю нескінченний цикл, який зупиниться тільки коли знайдемо оптимум
    while (true) {
      // змінна для збереження поточного значення цільової функції (z)
      let zValue = new DualNumber(0);
      for (let i = 0; i < currentBasis.length; i++) {
        // рахую значення z як суму добутків цін базисних змінних на вільні члени
        zValue = zValue.add(c[currentBasis[i]].mul(currentB[i].r));
      }

      // створюю масив для оцінок індексного рядка (дельт)
      const zRow: DualNumber[] = [];
      for (let j = 0; j < c.length; j++) {
        let sum = new DualNumber(0);
        for (let i = 0; i < currentBasis.length; i++) {
          sum = sum.add(c[currentBasis[i]].mul(currentA[i][j].r));
        }
        // рахую саму дельту за формулою c_j - sum і додаю в масив
        zRow.push(c[j].sub(sum));
      }

      // на початку ітерації припускаю, що мій план вже оптимальний
      let isOptimal = true;
      let enteringVar = -1;
      let bestDelta = new DualNumber(0);

      // пробігаюсь по всіх дельтах, щоб знайти напрямний стовпець
      for (let j = 0; j < zRow.length; j++) {
        // якщо шукаємо максимум
        if (isMax) {
          if (zRow[j].isPositive()) {
            isOptimal = false; // знайшов додатну дельту, значить ще не оптимум
            // вибираю ту змінну, яка дає найбільший додатний приріст
            if (enteringVar === -1 || zRow[j].compareTo(bestDelta) > 0) {
              enteringVar = j;
              bestDelta = zRow[j];
            }
          }
        // якщо шукаємо мінімум (як у нашій курсовій)
        } else {
          if (zRow[j].isNegative()) {
            isOptimal = false; // знайшов від'ємну дельту
            // вибираю ту змінну, дельта якої найменша (найбільша за модулем від'ємна)
            if (enteringVar === -1 || zRow[j].compareTo(bestDelta) < 0) {
              enteringVar = j;
              bestDelta = zRow[j];
            }
          }
        }
      }

      // перевіряю, чи не є система обмежень несумісною
      let isInfeasible = false;
      if (isOptimal) {
        for (let i = 0; i < currentBasis.length; i++) {
          // якщо план оптимальний, але штучна змінна все ще в базисі і більше нуля — розв'язку немає
          if (artificialVars.includes(currentBasis[i]) && currentB[i].r > 1e-7) {
            isInfeasible = true;
          }
        }
      }

      let leavingRow = -1;
      let minTheta = Infinity;
      const thetaStrings: string[] = [];

      // якщо план ще не оптимальний, роблю тета-тест для пошуку напрямного рядка
      if (!isOptimal) {
        for (let i = 0; i < currentB.length; i++) {
          const val = currentA[i][enteringVar].r;
          // розглядаю тільки додатні елементи напрямного стовпця
          if (val > 1e-7) {
            // ділю вільний член на додатний елемент стовпця
            const theta = currentB[i].r / val;
            thetaStrings.push(`для ${varNames[currentBasis[i]]} (${currentB[i].r.toFixed(0)} / ${val.toFixed(2)} = ${theta.toFixed(2)})`);
            // знаходжу найменше відношення (мінімальну тету)
            if (theta < minTheta) {
              minTheta = theta;
              leavingRow = i;
            }
          }
        }
      }

      // тут я генерую текстове пояснення кроку, яке потім побачить користувач на екрані
      let explanation = "";
      if (iteration === 0) {
        explanation += `Оскільки цільова функція спрямована на ${isMax ? 'максимізацію, ми шукаємо найбільшу додатну' : "мінімізацію, ми шукаємо найбільшу від'ємну"} оцінку Δj в індексному рядку. Поточне значення функції Z = ${zValue.toString()}. `;
      } else {
        explanation += `Матрицю було перераховано за методом Жордана-Гаусса. Поточне значення цільової функції Z = ${zValue.toString()}. `;
      }

      // НОВИЙ РОЗШИРЕНИЙ БЛОК ВИСНОВКІВ
      if (isOptimal) {
        if (isInfeasible) {
          explanation += `\nКритерій оптимальності формально виконано (в індексному рядку більше немає оцінок, що порушують умову), ПРОТЕ у фінальному базисі залишилися штучні змінні зі значенням, більшим за нуль:`;

          // знаходжу і виписую конкретні штучні змінні, які "застрягли" в базисі
          const leftArtVars = [];
          for (let i = 0; i < currentBasis.length; i++) {
            if (artificialVars.includes(currentBasis[i]) && currentB[i].r > 1e-7) {
              leftArtVars.push(`${varNames[currentBasis[i]]} = ${currentB[i].r.toFixed(2)}`);
            }
          }
          if (leftArtVars.length > 0) {
             explanation += `\n${leftArtVars.join('; ')}`;
          }

          explanation += `\nЦе стовідсотковий математичний доказ того, що система обмежень є несумісною. На практиці це означає критичну нестачу ресурсів: наявних потужностей механізмів або фонду часу просто не вистачає для виконання заданих жорстких планів. Неможливо задовольнити всі умови одночасно.`;

        } else {
          explanation += `\nКритерій оптимальності повністю виконано, оскільки серед оцінок Δj більше немає ${isMax ? 'додатних' : "від'ємних"} значень. Штучні базисні змінні відсутні. Алгоритм успішно знайшов фінальний оптимальний розв'язок!`;
          explanation += `\n\nЕкстремум цільової функції: Z = ${zValue.toString()}`;

          // формую красивий список усіх ненульових змінних, щоб користувачу було зручно списувати відповідь
          const resultVars = [];
          for (let i = 0; i < currentBasis.length; i++) {
            if (currentB[i].r > 1e-7) {
               resultVars.push(`${varNames[currentBasis[i]]} = ${currentB[i].r.toFixed(2)}`);
            }
          }
          if (resultVars.length > 0) {
            explanation += `\nЗначення змінних в оптимальному плані:\n${resultVars.join(', ')}`;
            explanation += `\n(Усі інші неперелічені змінні дорівнюють нулю).`;
          }
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

      // збираю всі дані поточної ітерації в один об'єкт
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

      // зберігаю об'єкт у загальний масив кроків
      steps.push(currentTableau);

      // якщо це був фінальний крок, виходжу з нескінченного циклу
      if (isOptimal) break;

      // починаю перерахунок матриці за правилом прямокутника (метод жордана-гаусса)
      const pivot = currentA[leavingRow][enteringVar].r;
      const nextA = currentA.map(row => row.map(() => new DualNumber(0)));
      const nextB = currentB.map(() => new DualNumber(0));

      // спочатку ділю весь напрямний рядок на розрізний елемент
      for (let j = 0; j < c.length; j++) {
        nextA[leavingRow][j] = currentA[leavingRow][j].div(pivot);
      }
      nextB[leavingRow] = currentB[leavingRow].div(pivot);

      // потім перераховую всі інші рядки
      for (let i = 0; i < currentB.length; i++) {
        if (i === leavingRow) continue;
        const factor = currentA[i][enteringVar].r;
        for (let j = 0; j < c.length; j++) {
          // віднімаю від старого елемента добуток (напрямний рядок * фактор)
          nextA[i][j] = currentA[i][j].sub(nextA[leavingRow][j].mul(factor));
        }
        nextB[i] = currentB[i].sub(nextB[leavingRow].mul(factor));
      }

      // заміняю старі матрицю та вектори на нові, щойно перераховані
      currentA = nextA;
      currentB = nextB;
      // оновлюю базис: змінюю стару змінну на нову
      currentBasis[leavingRow] = enteringVar;
      iteration++;
    }

    // повертаю масив з усіма кроками розв'язання
    return steps;
  }
}