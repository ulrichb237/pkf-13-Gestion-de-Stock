import type { ReactNode } from 'react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../ui/table';

interface Column<T> {
  header: string;
  cell: (row: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  getRowId: (row: T) => string | number;
}

/**
 * Seule implementation de tableau de liste du projet (spec §5).
 * Bascule responsive (spec §7) : table classique >= md, cartes empilees < md.
 */
export function DataTable<T>({ columns, data, getRowId }: DataTableProps<T>) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Aucune donnee.</p>;
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => <TableHead key={col.header}>{col.header}</TableHead>)}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((row) => (
              <TableRow key={getRowId(row)}>
                {columns.map((col) => <TableCell key={col.header}>{col.cell(row)}</TableCell>)}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 p-4 md:hidden">
        {data.map((row) => (
          <div key={getRowId(row)} data-testid="data-table-mobile-row" className="rounded-lg border border-border p-4">
            {columns.map((col) => (
              <div key={col.header} className="flex justify-between py-1 text-sm">
                <span className="text-muted-foreground">{col.header}</span>
                <span>{col.cell(row)}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
