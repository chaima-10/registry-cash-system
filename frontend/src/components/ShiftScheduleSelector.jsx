import React, { useState, useEffect } from 'react';
import { FiClock, FiCalendar, FiInfo } from 'react-icons/fi';
import { useTranslation } from 'react-i18next';

const ShiftScheduleSelector = ({ value, onChange, disabled = false }) => {
    const { t } = useTranslation();
    const [shiftType, setShiftType] = useState('MORNING');
    const [shiftStartTime, setShiftStartTime] = useState('08:00');
    const [shiftEndTime, setShiftEndTime] = useState('16:00');
    const [workingDays, setWorkingDays] = useState(['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);

    const daysOfWeek = [
        { key: 'Mon', label: 'Mon' },
        { key: 'Tue', label: 'Tue' },
        { key: 'Wed', label: 'Wed' },
        { key: 'Thu', label: 'Thu' },
        { key: 'Fri', label: 'Fri' },
        { key: 'Sat', label: 'Sat' },
        { key: 'Sun', label: 'Sun' }
    ];

    const shiftPresets = {
        MORNING: { start: '08:00', end: '16:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        EVENING: { start: '16:00', end: '00:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] },
        CUSTOM: { start: '09:00', end: '17:00', days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }
    };

    useEffect(() => {
        if (value) {
            setShiftType(value.shiftType || 'MORNING');
            setShiftStartTime(value.shiftStartTime || '08:00');
            setShiftEndTime(value.shiftEndTime || '16:00');
            setWorkingDays(value.shiftWorkingDays ? value.shiftWorkingDays.split(',') : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']);
        }
    }, [value]);

    const handleShiftTypeChange = (newShiftType) => {
        setShiftType(newShiftType);
        const preset = shiftPresets[newShiftType];
        setShiftStartTime(preset.start);
        setShiftEndTime(preset.end);
        if (newShiftType !== 'CUSTOM') {
            setWorkingDays(preset.days);
        }
        updateParent(newShiftType, preset.start, preset.end, newShiftType !== 'CUSTOM' ? preset.days : workingDays);
    };

    const handleTimeChange = (field, time) => {
        if (field === 'start') {
            setShiftStartTime(time);
        } else {
            setShiftEndTime(time);
        }
        updateParent(shiftType, field === 'start' ? time : shiftStartTime, field === 'end' ? time : shiftEndTime, workingDays);
    };

    const handleDayToggle = (day) => {
        const newDays = workingDays.includes(day)
            ? workingDays.filter(d => d !== day)
            : [...workingDays, day];
        setWorkingDays(newDays);
        updateParent(shiftType, shiftStartTime, shiftEndTime, newDays);
    };

    const updateParent = (type, start, end, days) => {
        const scheduleData = {
            shiftType: type,
            shiftStartTime: start,
            shiftEndTime: end,
            shiftWorkingDays: days.join(',')
        };
        onChange(scheduleData);
    };

    const formatScheduleDisplay = () => {
        const daysDisplay = workingDays.length === 7 ? 'All days' :
                           workingDays.length === 5 && !workingDays.includes('Sat') && !workingDays.includes('Sun') ? 'Mon to Fri' :
                           workingDays.join(', ');
        
        return `${shiftType} — ${daysDisplay} / ${shiftStartTime} to ${shiftEndTime}`;
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1 flex items-center gap-2">
                    <FiClock size={14} />
                    {t('shiftType', 'Shift Type')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                    {Object.keys(shiftPresets).map((type) => (
                        <button
                            key={type}
                            type="button"
                            onClick={() => handleShiftTypeChange(type)}
                            disabled={disabled}
                            className={`py-3 px-4 rounded-xl font-medium text-sm transition-all active:scale-95 ${
                                shiftType === type
                                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {type === 'MORNING' ? t('morningShift', 'Morning') :
                             type === 'EVENING' ? t('eveningShift', 'Evening') :
                             t('customShift', 'Custom')}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                        {t('startTime', 'Start Time')}
                    </label>
                    <input
                        type="time"
                        value={shiftStartTime}
                        onChange={(e) => handleTimeChange('start', e.target.value)}
                        disabled={disabled}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium disabled:opacity-50"
                    />
                </div>
                <div className="space-y-1.5">
                    <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">
                        {t('endTime', 'End Time')}
                    </label>
                    <input
                        type="time"
                        value={shiftEndTime}
                        onChange={(e) => handleTimeChange('end', e.target.value)}
                        disabled={disabled}
                        className="w-full px-4 py-3 bg-gray-50/50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white outline-none focus:border-blue-500 dark:focus:border-blue-500/50 focus:ring-4 focus:ring-blue-500/5 transition-all font-medium disabled:opacity-50"
                    />
                </div>
            </div>

            <div className="space-y-1.5">
                <label className="block text-[11px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1 flex items-center gap-2">
                    <FiCalendar size={14} />
                    {t('workingDays', 'Working Days')}
                </label>
                <div className="grid grid-cols-7 gap-2">
                    {daysOfWeek.map((day) => (
                        <button
                            key={day.key}
                            type="button"
                            onClick={() => handleDayToggle(day.key)}
                            disabled={disabled}
                            className={`py-2 px-1 rounded-lg text-xs font-medium transition-all active:scale-95 ${
                                workingDays.includes(day.key)
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                            } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {day.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
                <div className="flex items-start gap-3">
                    <FiInfo className="text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" size={16} />
                    <div className="text-sm">
                        <p className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                            {t('schedulePreview', 'Schedule Preview')}
                        </p>
                        <p className="text-blue-700 dark:text-blue-300 font-mono text-xs">
                            {formatScheduleDisplay()}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShiftScheduleSelector;
