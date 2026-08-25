import {
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isAfter,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday,
    startOfMonth,
    startOfWeek,
} from "date-fns"
import { ChevronLeft, ChevronRight, CalendarIcon } from "lucide-react"
import * as React from "react"
import type { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"

// ── Types ─────────────────────────────────────────────────────────────────────

type DisabledMatcher =
    | { before?: Date; after?: Date }
    | ((date: Date) => boolean)

interface DatePickerWithRangeProps {
    className?: string
    value?: DateRange
    onChange?: (range: DateRange | undefined) => void
    open?: boolean
    onOpenChange?: (open: boolean) => void
    disabled?: DisabledMatcher
    numberOfMonths?: number
    placeholder?: string
    align?: "start" | "end"
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function matchDisabled(date: Date, matcher?: DisabledMatcher): boolean {
    if (!matcher) return false
    if (typeof matcher === "function") return matcher(date)
    if (matcher.after && isAfter(date, matcher.after)) return true
    if (matcher.before && isBefore(date, matcher.before)) return true
    return false
}

function getMonthDays(month: Date): Date[] {
    return eachDayOfInterval({
        start: startOfWeek(startOfMonth(month), { weekStartsOn: 0 }),
        end:   endOfWeek(endOfMonth(month),     { weekStartsOn: 0 }),
    })
}

function resolveRange(from?: Date, to?: Date): [Date | undefined, Date | undefined] {
    if (!from || !to) return [from, to]
    return isAfter(from, to) ? [to, from] : [from, to]
}

// ── CalendarMonth ─────────────────────────────────────────────────────────────

const WEEK_DAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"]

interface CalendarMonthProps {
    month: Date
    from: Date | undefined
    to: Date | undefined
    onDayClick: (date: Date) => void
    onDayHover: (date: Date | undefined) => void
    disabled?: DisabledMatcher
    onPrev?: () => void
    onNext?: () => void
}

function CalendarMonth({ month, from, to, onDayClick, onDayHover, disabled, onPrev, onNext }: CalendarMonthProps) {
    const days = getMonthDays(month)

    return (
        <div className="select-none p-3">
            {/* Month header */}
            <div className="mb-3 flex items-center justify-between">
                <button
                    onClick={onPrev}
                    disabled={!onPrev}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:invisible"
                >
                    <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm font-semibold">{format(month, "MMMM yyyy")}</span>
                <button
                    onClick={onNext}
                    disabled={!onNext}
                    className="rounded p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:invisible"
                >
                    <ChevronRight className="h-4 w-4" />
                </button>
            </div>

            {/* Weekday headers */}
            <div className="mb-1 grid grid-cols-7">
                {WEEK_DAYS.map(d => (
                    <div key={d} className="flex h-8 items-center justify-center text-[11px] font-medium text-muted-foreground">
                        {d}
                    </div>
                ))}
            </div>

            {/* Day grid */}
            <div className="grid grid-cols-7">
                {days.map((day, i) => {
                    const inCurrentMonth = isSameMonth(day, month)
                    const isStart    = from ? isSameDay(day, from) : false
                    const isEnd      = to   ? isSameDay(day, to)   : false
                    const isSelected = isStart || isEnd
                    const inRange    = from && to && isAfter(day, from) && isBefore(day, to)
                    const isDisabled = matchDisabled(day, disabled) || !inCurrentMonth
                    const isTodayDay = isToday(day)

                    return (
                        <div
                            key={i}
                            className={cn(
                                "relative flex h-8 items-center justify-center",
                                inRange && "bg-primary/10",
                                isStart && !isEnd && "rounded-l-full bg-primary/10",
                                isEnd   && !isStart && "rounded-r-full bg-primary/10",
                            )}
                        >
                            <button
                                tabIndex={isDisabled ? -1 : 0}
                                disabled={isDisabled}
                                onClick={() => !isDisabled && onDayClick(day)}
                                onMouseEnter={() => !isDisabled && onDayHover(day)}
                                onMouseLeave={() => onDayHover(undefined)}
                                className={cn(
                                    "relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium transition-colors",
                                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                                    !inCurrentMonth && "invisible",
                                    inCurrentMonth && !isSelected && !isDisabled && "hover:bg-accent hover:text-accent-foreground",
                                    isTodayDay && !isSelected && "ring-1 ring-primary",
                                    isSelected && "bg-primary text-primary-foreground hover:bg-primary/90",
                                    isDisabled && inCurrentMonth && "cursor-not-allowed text-muted-foreground/40",
                                )}
                            >
                                {format(day, "d")}
                            </button>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}

// ── DatePickerWithRange ───────────────────────────────────────────────────────

export function DatePickerWithRange({
    className,
    value,
    onChange,
    open: controlledOpen,
    onOpenChange,
    disabled,
    numberOfMonths = 2,
    placeholder = "Pick a date range",
    align = "start",
}: DatePickerWithRangeProps) {
    const isControlled = controlledOpen !== undefined

    const [internalOpen, setInternalOpen]   = React.useState(false)
    const [internalRange, setInternalRange] = React.useState<DateRange | undefined>(value)
    const [hoverDate, setHoverDate]         = React.useState<Date | undefined>()
    const [baseMonth, setBaseMonth]         = React.useState<Date>(value?.from ?? new Date())
    const containerRef                       = React.useRef<HTMLDivElement>(null)

    const open  = isControlled ? controlledOpen! : internalOpen
    const range = isControlled ? value           : internalRange

    const setOpen = React.useCallback((v: boolean) => {
        if (!isControlled) setInternalOpen(v)
        onOpenChange?.(v)
    }, [isControlled, onOpenChange])

    // Close on outside click
    React.useEffect(() => {
        if (!open) return
        function onMouseDown(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener("mousedown", onMouseDown)
        return () => document.removeEventListener("mousedown", onMouseDown)
    }, [open, setOpen])

    function handleDayClick(day: Date) {
        // If no selection or both ends already picked, start fresh
        if (!range?.from || (range.from && range.to)) {
            const next = { from: day, to: undefined }
            if (!isControlled) setInternalRange(next)
            onChange?.(next)
            return
        }
        // Complete the range
        const [from, to] = resolveRange(range.from, day)
        const next = { from, to }
        if (!isControlled) setInternalRange(next)
        onChange?.(next)
        setOpen(false)
        setHoverDate(undefined)
    }

    // Effective range for highlight preview (hover when only `from` is set)
    const partialFrom = range?.from && !range.to ? range.from : undefined
    const [effectiveFrom, effectiveTo] = resolveRange(
        range?.from,
        range?.to ?? (partialFrom && hoverDate ? hoverDate : undefined),
    )

    const label = range?.from
        ? range.to
            ? `${format(range.from, "LLL dd, y")} – ${format(range.to, "LLL dd, y")}`
            : format(range.from, "LLL dd, y")
        : null

    const months = Array.from({ length: numberOfMonths }, (_, i) => addMonths(baseMonth, i))

    return (
        <div ref={containerRef} className={cn("relative inline-block", className)}>
            {/* Trigger */}
            <button
                onClick={() => setOpen(!open)}
                className={cn(
                    "flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm",
                    "ring-offset-background transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                    !label && "text-muted-foreground",
                )}
            >
                <CalendarIcon className="h-4 w-4 shrink-0" />
                <span>{label ?? placeholder}</span>
            </button>

            {/* Dropdown */}
            {open && (
                <div className={cn(
                    "absolute top-full z-50 mt-1 min-w-max rounded-lg border border-border bg-popover shadow-lg",
                    align === "end" ? "right-0" : "left-0",
                    "divide-x divide-border",
                    numberOfMonths > 1 ? "flex" : "",
                )}>
                    {months.map((month, i) => (
                        <CalendarMonth
                            key={i}
                            month={month}
                            from={effectiveFrom}
                            to={effectiveTo}
                            onDayClick={handleDayClick}
                            onDayHover={setHoverDate}
                            disabled={disabled}
                            onPrev={i === 0 ? () => setBaseMonth(m => addMonths(m, -1)) : undefined}
                            onNext={i === months.length - 1 ? () => setBaseMonth(m => addMonths(m, 1)) : undefined}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}
