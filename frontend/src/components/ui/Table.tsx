import React from 'react'

export interface TableProps extends React.TableHTMLAttributes<HTMLTableElement> {
  containerClassName?: string
}

export const Table: React.FC<TableProps> = ({ children, className = '', containerClassName = '', ...props }) => {
  return (
    <div className={`w-full overflow-x-auto rounded-lg border border-surface-border bg-white shadow-sm ${containerClassName}`}>
      <table className={`w-full text-left border-collapse text-xs sm:text-sm ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
}

export const Thead: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => {
  return (
    <thead className={`bg-slate-50 border-b border-surface-border text-slate-600 text-xs font-semibold uppercase tracking-wider select-none ${className}`} {...props}>
      {children}
    </thead>
  )
}

export const Tbody: React.FC<React.HTMLAttributes<HTMLTableSectionElement>> = ({ children, className = '', ...props }) => {
  return (
    <tbody className={`divide-y divide-slate-100 bg-white text-slate-700 ${className}`} {...props}>
      {children}
    </tbody>
  )
}

export const Tr: React.FC<React.HTMLAttributes<HTMLTableRowElement>> = ({ children, className = '', ...props }) => {
  return (
    <tr className={`hover:bg-slate-50/80 transition-colors ${className}`} {...props}>
      {children}
    </tr>
  )
}

export interface ThProps extends React.ThHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
}

export const Th: React.FC<ThProps> = ({ children, align = 'left', className = '', ...props }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align]

  return (
    <th className={`px-4 py-3 font-semibold text-slate-700 ${alignClass} ${className}`} {...props}>
      {children}
    </th>
  )
}

export interface TdProps extends React.TdHTMLAttributes<HTMLTableCellElement> {
  align?: 'left' | 'center' | 'right'
  tabular?: boolean
}

export const Td: React.FC<TdProps> = ({ children, align = 'left', tabular = false, className = '', ...props }) => {
  const alignClass = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  }[align]

  return (
    <td className={`px-4 py-3 text-slate-700 ${alignClass} ${tabular ? 'tabular-nums font-mono text-xs' : ''} ${className}`} {...props}>
      {children}
    </td>
  )
}

