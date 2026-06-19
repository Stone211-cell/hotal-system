"use client"

import * as React from "react"
import { format } from "date-fns"
import { th } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps {
  value?: string // YYYY-MM-DD
  onChange?: (value: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  required?: boolean
  min?: string
}

export function DatePicker({ value, onChange, placeholder = "เลือกวันที่", className, disabled, required, min }: DatePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(value ? new Date(value) : undefined)

  React.useEffect(() => {
    if (value) {
      setDate(new Date(value))
    } else {
      setDate(undefined)
    }
  }, [value])

  const handleSelect = (selectedDate: Date | undefined) => {
    setDate(selectedDate)
    if (onChange) {
      if (selectedDate) {
        // adjust for timezone offset to prevent date shifting
        const offset = selectedDate.getTimezoneOffset()
        const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000))
        onChange(localDate.toISOString().split("T")[0])
      } else {
        onChange("")
      }
    }
  }

  const minDate = min ? new Date(min) : undefined

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "d MMM yyyy", { locale: th }) : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={handleSelect}
          disabled={(d) => minDate ? d < new Date(minDate.setHours(0,0,0,0)) : false}
          locale={th}
        />
      </PopoverContent>
      {/* Hidden input to support native form validation and "required" attribute */}
      {required && (
        <input
          type="text"
          className="absolute opacity-0 w-0 h-0 pointer-events-none"
          required
          value={value || ""}
          onChange={() => {}}
          tabIndex={-1}
        />
      )}
    </Popover>
  )
}
