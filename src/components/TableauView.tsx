import React from 'react';
import { Tableau } from '../math/SimplexSolver';

// експортую компонент, який приймає об'єкт таблиці і малює її на екрані
export const TableauView: React.FC<{ tableau: Tableau }> = ({ tableau }) => {
  // тут починається відмальовка інтерфейсу
  return (
    <div className="mb-10 p-8 bg-white rounded-xl shadow-md border border-gray-100 overflow-x-auto">
      {/* виводжу номер ітерації і динамічно додаю слово "фінальна", якщо спрацював критерій оптимальності */}
      <h3 className="text-xl font-black mb-6 text-indigo-900 border-b pb-2">
        Ітерація {tableau.iteration} {tableau.isOptimal && "(Фінальна)"}
      </h3>

      <table className="min-w-full text-sm text-left text-gray-700 mb-6">
        <thead className="bg-indigo-50 text-indigo-900 uppercase">
          <tr>
            <th className="px-4 py-3 border border-indigo-100 rounded-tl-lg">Базис</th>
            <th className="px-4 py-3 border border-indigo-100 font-bold">b</th>

            {/* циклом пробігаюсь по іменах змінних, щоб згенерувати шапку таблиці */}
            {tableau.varNames.map((name, i) => {
              // найголовніше: якщо індекс стовпця збігається з напрямним стовпцем, фарбую його у зелений
              const isEntering = i === tableau.enteringVar;
              return (
                <th key={name} className={`px-4 py-3 border border-indigo-100 ${isEntering ? 'bg-green-100 text-green-800' : ''}`}>
                  {name}
                </th>
              );
            })}

          </tr>
        </thead>
        <tbody>
          {/* циклом пробігаюсь по кожному рядку моєї матриці */}
          {tableau.matrix.map((row, i) => {
            // якщо змінна в цьому рядку має вийти з базису (напрямний рядок), підсвічую весь рядок жовтим
            const isLeaving = tableau.basisIndices[i] === tableau.leavingVar;
            return (
              <tr key={i} className={`hover:bg-gray-50 transition ${isLeaving ? 'bg-yellow-50' : ''}`}>
                <td className="px-4 py-2 border font-bold text-gray-800">{tableau.varNames[tableau.basisIndices[i]]}</td>
                <td className="px-4 py-2 border font-semibold text-gray-900">{tableau.rhs[i].toString()}</td>

                {/* пробігаюсь по кожній клітинці в рядку */}
                {row.map((val, j) => {
                  // знову перевіряю, чи не потрапила ця клітинка у зелений напрямний стовпець
                  const isEnteringCol = j === tableau.enteringVar;
                  return (
                    <td key={j} className={`px-4 py-2 border text-gray-600 ${isEnteringCol ? 'bg-green-50' : ''}`}>
                      {/* викликаю мій метод toString() класу DualNumber, щоб гарно відмалювати штрафи M */}
                      {val.toString()}
                    </td>
                  );
                })}

              </tr>
            );
          })}

          {/* окремо малюю останній рядок — індексний (з дельтами) */}
          <tr className="bg-gray-100 font-bold border-t-2 border-gray-300">
            <td className="px-4 py-3 border text-indigo-700">Δj</td>
            <td className="px-4 py-3 border text-indigo-900">{tableau.zValue.toString()}</td>

            {/* циклом виводжу всі оцінки дельта, і так само підсвічую напрямну оцінку зеленим */}
            {tableau.zRow.map((val, j) => {
              const isEnteringCol = j === tableau.enteringVar;
              return (
                <td key={j} className={`px-4 py-3 border text-gray-800 ${isEnteringCol ? 'bg-green-200' : ''}`}>
                  {val.toString()}
                </td>
              );
            })}

          </tr>
        </tbody>
      </table>

      {/* розумний блок з висновками (мій "світлофор") */}
      {/* перевірка №1: якщо критерій оптимальності виконався, АЛЕ в базисі є штучна змінна */}
      {tableau.isOptimal && tableau.isInfeasible ? (
        <div className="bg-red-50 border-l-4 border-red-600 p-5 rounded-r-lg shadow-sm">
          <h4 className="text-lg font-black text-red-800 uppercase mb-2 flex items-center gap-2">
            Задача не має допустимого розв'язку!
          </h4>
          {/* розбиваю текст пояснення на абзаци, щоб він красиво читався */}
          {tableau.explanation.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-2 text-red-900 leading-relaxed font-medium">
              {paragraph}
            </p>
          ))}
        </div>
      ) : tableau.isOptimal ? (
        /* перевірка №2: якщо план оптимальний і все чисто (штучні змінні пішли) */
        <div className="bg-green-50 border-l-4 border-green-600 p-5 rounded-r-lg shadow-sm">
          <h4 className="text-lg font-black text-green-800 uppercase mb-2 flex items-center gap-2">
            Оптимальний план успішно знайдено!
          </h4>
          {tableau.explanation.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-2 text-green-900 leading-relaxed font-medium">
              {paragraph}
            </p>
          ))}
        </div>
      ) : (
        /* перевірка №3: якщо це просто робоча проміжна ітерація */
        <div className="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-r-lg shadow-sm">
          <h4 className="text-sm font-bold text-blue-800 uppercase mb-2">Хід розв'язання:</h4>
          {tableau.explanation.split('\n').map((paragraph, idx) => (
            <p key={idx} className="mb-2 text-gray-800 leading-relaxed font-medium">
              {paragraph}
            </p>
          ))}
        </div>
      )}
    </div>
  );
};