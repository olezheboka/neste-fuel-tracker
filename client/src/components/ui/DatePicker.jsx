import * as React from "react"
import { format } from "date-fns"
import { enUS, lv, ru } from "date-fns/locale"
import { Calendar as CalendarIcon } from "lucide-react"
import { twMerge } from "tailwind-merge"
import { clsx } from "clsx"

import { Calendar } from "./Calendar"
import { Popover, PopoverContent, PopoverTrigger } from "./Popover"

const localeMap = {
  en: enUS,
  lv: lv,
  ru: ru,
}

export function DateRangePicker({ 
  startDate, 
  endDate, 
  onRangeChange, 
  className, 
  locale = "en",
  placeholder = "Select period",
  disabled
}) {
  const currentLocale = localeMap[locale] || enUS

  // Format helper
  const fmt = (d) => {
    if (!d) return null
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  const range = React.useMemo(() => ({
    from: startDate ? new Date(startDate) : undefined,
    to: endDate ? new Date(endDate) : undefined,
  }), [startDate, endDate])

  const handleSelect = (newRange) => {
    // If we select a range or click a day, it updates both from/to
    // If user clicks a single day twice, it comes back as undefined range
    if (!newRange) {
      onRangeChange(null, null)
      return
    }
    onRangeChange(fmt(newRange.from), fmt(newRange.to))
  }


  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={twMerge(
            clsx(
              "flex items-center gap-2 px-3 py-1.5 h-[32px] sm:h-[34px] rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-xs font-semibold shadow-sm w-full sm:w-auto",
              (!startDate || !endDate) && "text-gray-400",
              className
            )
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-gray-400" />
            <span className="truncate">
              {startDate ? (
                endDate ? (
                  <>
                    {format(new Date(startDate), "dd.MM.yy", { locale: currentLocale })}
                    {" — "}
                    {format(new Date(endDate), "dd.MM.yy", { locale: currentLocale })}
                  </>
                ) : (
                  format(new Date(startDate), "dd.MM.yy", { locale: currentLocale })
                )
              ) : (
                placeholder
              )}
            </span>
          </div>

        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-none shadow-xl rounded-xl" align="start">
        <Calendar
          mode="range"
          selected={range}
          onSelect={handleSelect}
          locale={currentLocale}
          className="rounded-xl bg-white p-3"
          animate
          captionLayout="label"
          defaultMonth={new Date()}
          navLayout="around"
          numberOfMonths={1}
          resetOnSelect
          showOutsideDays
          timeZone="Europe/Riga"
          weekStartsOn={1}
          disabled={disabled}
          initialFocus
          required
        />
      </PopoverContent>
    </Popover>
  )
}
