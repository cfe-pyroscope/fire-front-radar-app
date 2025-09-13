import React, { useMemo } from 'react';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '../css/DatePicker.css';

type DateLike = Date | string | number | { toDate: () => Date };

export interface DatePickerProps {
    value: Date;
    onChange: (value: Date) => void;
    availableDates?: readonly DateLike[] | null; // ← more permissive
    mode?: string;
}

// Turn anything (Date | dayjs | string | number) into a Date
function toRealDate(input: unknown): Date | null {
    if (!input) return null;
    if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
    if (typeof input === 'object' && typeof (input as any).toDate === 'function') {
        const d = (input as any).toDate();
        return d instanceof Date && !Number.isNaN(d.getTime()) ? d : null;
    }
    const d = new Date(input as any);
    return Number.isNaN(d.getTime()) ? null : d;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, availableDates, mode }) => {
    // Normalize once
    const normalized = useMemo(
        () => (availableDates ? (availableDates.map(toRealDate).filter(Boolean) as Date[]) : undefined),
        [availableDates]
    );

    return (
        <div className="datepicker-container">
            <DatePickerInput
                value={value}
                minDate={normalized?.[0]}
                maxDate={normalized?.[normalized.length - 1]}
                excludeDate={(raw) => {
                    const date = toRealDate(raw);
                    if (!date || !normalized) return false;
                    const target = date.toDateString();
                    return !normalized.some((d) => d.toDateString() === target);
                }}
                onChange={(next) => {
                    const date = toRealDate(next);
                    if (!date) return;
                    const normalizedUTC = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 0));
                    onChange(normalizedUTC);
                }}
                placeholder="Pick date"
                label={mode || 'Pick date'}
                required
                clearable={false}
                dropdownType="popover"
                popoverProps={{ position: 'bottom-end', withinPortal: true }}
            />
        </div>
    );
};

export default DatePicker;
