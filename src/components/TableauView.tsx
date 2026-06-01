import React from 'react';
import { Tableau } from '../math/SimplexSolver';

export const TableauView: React.FC<{ tableau: Tableau }> = ({ tableau }) => {
  return (
    <div className="mb-8 p-6 bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto">
      <h3 className="text-lg font-bold mb-4 text-blue-800">
        Ітерація {tableau.iteration} {tableau.isOptimal && "(Фінальна)"}
      </h3>
      <table className="min-w-full text-sm text-left text-gray-700">
        <thead className="bg-gray-100 text-gray-900 uppercase">
          <tr>
            <th className="px-4 py-2 border">Базис</th>
            <th className="px-4 py-2 border font-bold text-red-600">b</th>
            {tableau.varNames.map((name, i) => (
              <th key={name} className={`px-4 py-2 border ${i === tableau.enteringVar ? 'bg-green-100 text-green-800' : ''}`}>
                {name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tableau.matrix.map((row, i) => (
            <tr key={i} className={tableau.basisIndices[i] === tableau.leavingVar ? 'bg-yellow-50' : ''}>
              <td className="px-4 py-2 border font-semibold">{tableau.varNames[tableau.basisIndices[i]]}</td>
              <td className="px-4 py-2 border font-bold">{tableau.rhs[i].toString()}</td>
              {row.map((val, j) => (
                <td key={j} className={`px-4 py-2 border ${j === tableau.enteringVar ? 'bg-green-50' : ''}`}>
                  {val.toString()}
                </td>
              ))}
            </tr>
          ))}
          <tr className="bg-gray-50 font-bold">
            <td className="px-4 py-2 border text-blue-700">Δj</td>
            <td className="px-4 py-2 border text-red-600">{tableau.zValue.toString()}</td>
            {tableau.zRow.map((val, j) => (
              <td key={j} className={`px-4 py-2 border ${j === tableau.enteringVar ? 'bg-green-100' : ''}`}>
                {val.toString()}
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      <div className="mt-4 text-sm space-y-1">
        {!tableau.isOptimal && (
          <>
            <p>Входить до базису: <span className="font-bold text-green-600">{tableau.varNames[tableau.enteringVar!]}</span></p>
            <p>Виходить з базису: <span className="font-bold text-yellow-600">{tableau.varNames[tableau.leavingVar!]}</span></p>
          </>
        )}
        {tableau.isOptimal && tableau.isInfeasible && (
          <div className="p-4 mt-4 bg-red-100 text-red-800 rounded-lg">
            <strong className="block mb-1">Увага: Задача не має допустимого розв'язку!</strong>
            Штучна змінна залишилася в базисі зі значенням більше нуля. Це свідчить про те, що система обмежень несумісна.
          </div>
        )}
        {tableau.isOptimal && !tableau.isInfeasible && (
          <div className="p-4 mt-4 bg-green-100 text-green-800 rounded-lg">
            <strong>Оптимальний план знайдено!</strong> Мінімальні витрати становлять: {tableau.zValue.toString()}.
          </div>
        )}
      </div>
    </div>
  );
};