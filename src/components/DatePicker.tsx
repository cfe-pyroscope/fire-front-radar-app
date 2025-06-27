import React from 'react';
import { DatePickerInput } from '@mantine/dates';
import '@mantine/dates/styles.css';
import '../css/DatePicker.css';

interface DatePickerProps {
    value: Date;
    onChange: (value: Date) => void;
}

const DatePicker: React.FC<DatePickerProps> = ({ value, onChange }) => {
    return (
        <div className="datepicker-container">
            <DatePickerInput
                value={value}
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
                label="Pick date"
                required
                maxDate={new Date()}
                clearable={false}
                dropdownType="popover"
                popoverProps={{ position: 'bottom-end', withinPortal: true }}
            />
        </div>
    );
};

export default DatePicker;
