import { useState } from 'react';
import { DualNumber } from './math/DualNumber';
import { SimplexSolver, Tableau } from './math/SimplexSolver';
import { TableauView } from './components/TableauView';

interface ConstraintInput {
  coeffs: string[];
  sign: '<=' | '>=' | '=';
  rhs: string;
}

export default function App() {
  const [numVars, setNumVars] = useState<number>(9);
  const [numConstraints, setNumConstraints] = useState<number>(6);

  // Додано перемикач Min / Max
  const [goal, setGoal] = useState<'min' | 'max'>('min');

  const [objective, setObjective] = useState<string[]>(Array(9).fill(''));
  const [constraints, setConstraints] = useState<ConstraintInput[]>(
    Array(6).fill(null).map(() => ({
      coeffs: Array(9).fill(''),
      sign: '<=',
      rhs: '',
    }))
  );

  const [steps, setSteps] = useState<Tableau[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadDefaultExample = () => {
    setNumVars(9);
    setNumConstraints(6);
    setGoal('min');
    setObjective(['2', '4', '3', '3', '2', '5', '5', '3', '6']);
    setConstraints([
      { coeffs: ['1', '1', '1', '0', '0', '0', '0', '0', '0'], sign: '<=', rhs: '400' },
      { coeffs: ['0', '0', '0', '1', '1', '1', '0', '0', '0'], sign: '<=', rhs: '300' },
      { coeffs: ['0', '0', '0', '0', '0', '0', '1', '1', '1'], sign: '<=', rhs: '280' },
      { coeffs: ['30', '0', '0', '20', '0', '0', '60', '0', '0'], sign: '>=', rhs: '6000' },
      { coeffs: ['0', '30', '0', '0', '20', '0', '0', '40', '0'], sign: '>=', rhs: '50000' },
      { coeffs: ['0', '0', '40', '0', '0', '50', '0', '0', '20'], sign: '>=', rhs: '8000' },
    ]);
    setSteps([]);
    setError(null);
  };

  const handleDimensionChange = (vars: number, constrs: number) => {
    if (vars < 1 || constrs < 1) return;
    setNumVars(vars);
    setNumConstraints(constrs);

    setObjective(prev => {
      const next = [...prev];
      while (next.length < vars) next.push('');
      return next.slice(0, vars);
    });

    setConstraints(prev => {
      let next = prev.map(c => {
        const nextCoeffs = [...c.coeffs];
        while (nextCoeffs.length < vars) nextCoeffs.push('');
        return { ...c, coeffs: nextCoeffs.slice(0, vars) };
      });
      while (next.length < constrs) {
        next.push({ coeffs: Array(vars).fill(''), sign: '<=', rhs: '' });
      }
      return next.slice(0, constrs);
    });
    setSteps([]);
    setError(null);
  };

  const solveProblem = () => {
    setError(null);
    try {
      const isMax = goal === 'max';
      const cMain = objective.map(v => parseFloat(v));
      if (cMain.some(isNaN)) {
        throw new Error("Всі коефіцієнти цільової функції повинні бути числами.");
      }

      const parsedConstraints = constraints.map((c, idx) => {
        const coeffs = c.coeffs.map(v => parseFloat(v));
        const rhs = parseFloat(c.rhs);
        if (coeffs.some(isNaN) || isNaN(rhs)) {
          throw new Error(`Обмеження №${idx + 1} містить помилки (заповніть усі поля числами).`);
        }
        if (rhs < 0) {
          throw new Error(`Вільний член (b) в обмеженні №${idx + 1} від'ємний. Обов'язкова умова b >= 0.`);
        }
        return { coeffs, sign: c.sign, rhs };
      });

      let totalSlackSurplus = 0;
      let totalArtificial = 0;

      parsedConstraints.forEach(c => {
        if (c.sign === '<=' || c.sign === '>=') totalSlackSurplus++;
        if (c.sign === '>=' || c.sign === '=') totalArtificial++;
      });

      const totalCols = numVars + totalSlackSurplus + totalArtificial;
      const varNames: string[] = [];
      for (let i = 1; i <= numVars; i++) varNames.push(`x${i}`);
      for (let i = 1; i <= totalSlackSurplus; i++) varNames.push(`s${i}`);
      for (let i = 1; i <= totalArtificial; i++) varNames.push(`a${i}`);

      const cReal = Array(totalCols).fill(0);
      const cM = Array(totalCols).fill(0);

      for (let j = 0; j < numVars; j++) cReal[j] = cMain[j];

      const A_matrix: number[][] = Array(numConstraints).fill(null).map(() => Array(totalCols).fill(0));
      const b_vector: number[] = [];
      const basisIndices: number[] = [];
      const artificialVarsIndices: number[] = [];

      let currentSlackSurplusCol = numVars;
      let currentArtificialCol = numVars + totalSlackSurplus;

      parsedConstraints.forEach((c, i) => {
        b_vector.push(c.rhs);
        for (let j = 0; j < numVars; j++) A_matrix[i][j] = c.coeffs[j];

        if (c.sign === '<=') {
          A_matrix[i][currentSlackSurplusCol] = 1;
          basisIndices.push(currentSlackSurplusCol);
          currentSlackSurplusCol++;
        } else if (c.sign === '>=') {
          A_matrix[i][currentSlackSurplusCol] = -1;
          currentSlackSurplusCol++;

          A_matrix[i][currentArtificialCol] = 1;
          // КРИТИЧНО ДЛЯ М-МЕТОДУ: +M для Min, -M для Max
          cM[currentArtificialCol] = isMax ? -1 : 1;
          artificialVarsIndices.push(currentArtificialCol);
          basisIndices.push(currentArtificialCol);
          currentArtificialCol++;
        } else if (c.sign === '=') {
          A_matrix[i][currentArtificialCol] = 1;
          cM[currentArtificialCol] = isMax ? -1 : 1;
          artificialVarsIndices.push(currentArtificialCol);
          basisIndices.push(currentArtificialCol);
          currentArtificialCol++;
        }
      });

      const cDual = cReal.map((r, idx) => new DualNumber(r, cM[idx]));
      const solver = new SimplexSolver();
      const resultSteps = solver.solve(cDual, A_matrix, b_vector, basisIndices, varNames, artificialVarsIndices, isMax);
      setSteps(resultSteps);

    } catch (e: unknown) {
      if (e instanceof Error) setError(e.message);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 max-w-7xl mx-auto text-gray-800">
      <header className="mb-8 p-6 bg-gradient-to-r from-blue-700 to-indigo-800 text-white rounded-2xl shadow-md">
        <h1 className="text-3xl font-extrabold mb-2">Симплекс-Калькулятор</h1>
        <p className="opacity-90">Введіть дані, виберіть ціль, і програма розпише кожен крок вашої задачі.</p>
        <div className="mt-4 flex gap-4">
          <button onClick={loadDefaultExample} className="px-4 py-2 bg-white bg-opacity-20 hover:bg-opacity-30 rounded-lg font-semibold transition">
            Завантажити приклад з курсової
          </button>
        </div>
      </header>

      <section className="mb-6 p-4 bg-white rounded-xl shadow-sm border flex flex-wrap gap-6 items-center">
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Змінних (n)</label>
          <input type="number" value={numVars} onChange={(e) => handleDimensionChange(parseInt(e.target.value) || 1, numConstraints)} className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Обмежень (m)</label>
          <input type="number" value={numConstraints} onChange={(e) => handleDimensionChange(numVars, parseInt(e.target.value) || 1)} className="w-24 p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"/>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 mb-8">
        <div className="p-6 bg-white rounded-xl shadow-sm border">
          <h2 className="text-lg font-bold mb-4 text-blue-900">Цільова функція</h2>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-gray-600">Z =</span>
            {objective.map((val, idx) => (
              <div key={idx} className="flex items-center gap-1">
                <input type="text" value={val} placeholder="0" onChange={(e) => { const next = [...objective]; next[idx] = e.target.value; setObjective(next); }} className="w-16 p-2 text-center border rounded-lg font-mono focus:bg-blue-50 outline-none"/>
                <span className="text-sm font-semibold text-gray-500">x{idx + 1} {idx < numVars - 1 ? '+' : ''}</span>
              </div>
            ))}
            <span className="text-blue-700 font-bold ml-2">→</span>
            {/* Вибір Min / Max */}
            <select value={goal} onChange={(e) => setGoal(e.target.value as 'min' | 'max')} className="p-2 border-2 border-blue-500 rounded-lg text-blue-700 font-bold outline-none cursor-pointer">
              <option value="min">min</option>
              <option value="max">max</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-sm border overflow-x-auto">
          <h2 className="text-lg font-bold mb-4 text-blue-900">Система обмежень</h2>
          <div className="space-y-3 min-w-[600px]">
            {constraints.map((constraint, i) => (
              <div key={i} className="flex items-center gap-2 bg-gray-50 p-2 rounded-lg">
                <span className="w-8 font-bold text-gray-400 text-sm">#{i + 1}</span>
                {constraint.coeffs.map((val, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <input type="text" value={val} placeholder="0" onChange={(e) => { const next = [...constraints]; next[i].coeffs[j] = e.target.value; setConstraints(next); }} className="w-14 p-1.5 text-center border rounded font-mono outline-none focus:bg-indigo-50"/>
                    <span className="text-xs text-gray-400 font-mono">x{j + 1}</span>
                  </div>
                ))}
                <select value={constraint.sign} onChange={(e) => { const next = [...constraints]; next[i].sign = e.target.value as '<=' | '>=' | '='; setConstraints(next); }} className="mx-2 p-1.5 border rounded bg-white font-bold text-gray-700 outline-none cursor-pointer">
                  <option value="<=">&le;</option>
                  <option value=">=">&ge;</option>
                  <option value="=">=</option>
                </select>
                <input type="text" value={constraint.rhs} placeholder="b" onChange={(e) => { const next = [...constraints]; next[i].rhs = e.target.value; setConstraints(next); }} className="w-20 p-1.5 text-center border rounded font-bold font-mono outline-none bg-red-50 focus:bg-red-100"/>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="mb-8">
        <button onClick={solveProblem} className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition transform active:scale-95">
          Розрахувати з описом кроків
        </button>
        {error && <div className="mt-4 p-4 bg-red-100 text-red-800 rounded-xl font-medium border border-red-200">{error}</div>}
      </div>

      {steps.length > 0 && (
        <section className="space-y-6">
          <h2 className="text-2xl font-extrabold text-gray-900 border-b pb-2">Результат покрокового виконання алгоритму</h2>
          {steps.map((step, idx) => <TableauView key={idx} tableau={step} />)}
        </section>
      )}
    </div>
  );
}