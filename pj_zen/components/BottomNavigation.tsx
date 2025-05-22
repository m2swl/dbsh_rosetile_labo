
import React from 'react';
import { NavLink } from 'react-router-dom';
import { NAVIGATION_ITEMS } from '../constants';

const BottomNavigation: React.FC = () => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-50 border-t border-slate-300 shadow-md flex justify-around items-center z-50">
      {NAVIGATION_ITEMS.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-1/3 h-full p-2 transition-colors duration-200 ease-in-out
             ${isActive ? 'text-indigo-600' : 'text-slate-500 hover:text-indigo-500'}`
          }
        >
          {item.icon(`w-6 h-6 mb-1 ${ ({ isActive }: {isActive: boolean}) => isActive ? 'fill-indigo-600' : 'fill-slate-500'}`)}
          <span className="text-xs font-medium">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
};

export default BottomNavigation;
