import { Button } from '@/components/ui/button';
import { router } from '@inertiajs/react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface Column<T> {
    key: string;
    header: string;
    headerClassName?: string;
    cellClassName?: string;
    render?: (row: T) => React.ReactNode;
}

export interface Paginator<T> {
    data: T[];
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
    from: number | null;
    to: number | null;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    paginator: Paginator<T>;
    rowKey: (row: T) => string | number;
    emptyMessage?: string;
}

function goToPage(page: number) {
    router.get(window.location.pathname, { page }, { preserveState: true, preserveScroll: true, replace: true });
}

export function DataTable<T>({ columns, paginator, rowKey, emptyMessage = 'No records found.' }: DataTableProps<T>) {
    const { data, current_page, last_page, total, from, to } = paginator;

    return (
        <div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="bg-muted/40 text-muted-foreground border-b text-left text-xs font-medium tracking-wider uppercase">
                            {columns.map((col) => (
                                <th key={col.key} className={`px-6 py-3 ${col.headerClassName ?? ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length} className="text-muted-foreground px-6 py-8 text-center">
                                    {emptyMessage}
                                </td>
                            </tr>
                        ) : (
                            data.map((row) => (
                                <tr key={rowKey(row)} className="hover:bg-muted/30 transition-colors">
                                    {columns.map((col) => (
                                        <td key={col.key} className={`px-6 py-4 ${col.cellClassName ?? ''}`}>
                                            {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? '')}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <div className="flex items-center justify-between border-t px-6 py-3">
                <p className="text-muted-foreground text-xs">{total === 0 ? 'No results' : `Showing ${from ?? 0}–${to ?? 0} of ${total}`}</p>

                {last_page > 1 && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={current_page === 1}
                            onClick={() => goToPage(1)}
                            aria-label="First page"
                        >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={current_page === 1}
                            onClick={() => goToPage(current_page - 1)}
                            aria-label="Previous page"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="text-muted-foreground min-w-[7rem] text-center text-xs">
                            Page {current_page} of {last_page}
                        </span>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={current_page === last_page}
                            onClick={() => goToPage(current_page + 1)}
                            aria-label="Next page"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            disabled={current_page === last_page}
                            onClick={() => goToPage(last_page)}
                            aria-label="Last page"
                        >
                            <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
