import React from 'react';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '../css/DatePicker.css';

interface DatePickerProps {
    value: Date;
    onChange: (value: Date) => void;
    availableDates?: Date[];
    mode?: string;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange, availableDates, mode }) => {
    return (
        <div className="datepicker-container">
            <DatePickerInput
                value={value}
                minDate={availableDates?.[0]}
                maxDate={availableDates?.[availableDates.length - 1]}
                excludeDate={(input) => {
                    const date = input instanceof Date ? input : new Date(input);

                    if (!availableDates || isNaN(date.getTime())) {
                        return false;
                    }

                    const targetDateStr = date.toDateString();
                    const match = availableDates.some(d => d.toDateString() === targetDateStr);

                    if (!match) {
                        // console.log("⛔️ Excluding date:", targetDateStr);
                    }

                    return !match;
                }}



                onChange={(dateInput) => {
                    console.log('DatePicker raw change:', dateInput);
                    // Convert input to Date, whether it's already a Date or a string
                    const parsedDate = dateInput instanceof Date ? dateInput : new Date(dateInput);

                    if (parsedDate instanceof Date && !isNaN(parsedDate.getTime())) {
                        const normalized = new Date(Date.UTC(
                            parsedDate.getFullYear(),
                            parsedDate.getMonth(),
                            parsedDate.getDate(),
                            12 // shift to 12:00 UTC to avoid selecting midnight, which is earlier than the first forecast time in NetCDF files
                        ));

                        console.log('Normalized date in DatePicker:', normalized);
                        onChange(normalized); // Propagate to parent
                    } else {
                        console.warn('Invalid date selected:', dateInput);
                    }
                }}
                placeholder="Pick date"
                label={mode || "Pick date"}
                required
                // maxDate={new Date()}
                clearable={false}
                dropdownType="popover"
                popoverProps={{ position: 'bottom-end', withinPortal: true }}
            />
        </div>
    );
};

export default DatePicker;
