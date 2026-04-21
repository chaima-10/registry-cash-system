/**
 * Calculate the number of working days in the current month based on schedule
 * @param {string} workingDaysSchedule - e.g., "Mon,Tue,Wed" or "Mon-Fri"
 * @returns {number} - Number of working days in current month
 */
export const getTotalWorkingDaysInMonth = (workingDaysSchedule) => {
    if (!workingDaysSchedule) return 22; // Default assumption

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Parse schedule
    const schedule = workingDaysSchedule.toLowerCase().replace(/\s/g, '');
    const dayMap = {
        'sun': 0, 'sunday': 0,
        'mon': 1, 'monday': 1,
        'tue': 2, 'tuesday': 2,
        'wed': 3, 'wednesday': 3,
        'thu': 4, 'thursday': 4,
        'fri': 5, 'friday': 5,
        'sat': 6, 'saturday': 6
    };

    let workingDayIndices = [];

    // Handle ranges like "Mon-Fri"
    if (schedule.includes('-')) {
        const parts = schedule.split('-');
        const start = dayMap[parts[0]];
        const end = dayMap[parts[1]];
        if (start !== undefined && end !== undefined) {
            for (let i = start; i <= end; i++) {
                workingDayIndices.push(i);
            }
        }
    } else {
        // Handle comma-separated like "Mon,Tue,Wed"
        const days = schedule.split(',');
        days.forEach(day => {
            const idx = dayMap[day];
            if (idx !== undefined && !workingDayIndices.includes(idx)) {
                workingDayIndices.push(idx);
            }
        });
    }

    if (workingDayIndices.length === 0) return 22; // Default

    // Count working days in current month
    let count = 0;
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        if (workingDayIndices.includes(date.getDay())) {
            count++;
        }
    }

    return count;
};

/**
 * Calculate net salary after absence deductions
 * Formula: Net = Monthly Salary - (Daily Salary × Absence Days)
 * Daily Salary = Monthly Salary ÷ Total working days in month
 * 
 * @param {number} monthlySalary - Original monthly salary
 * @param {number} absences - Number of absence days
 * @param {string} workingDaysSchedule - e.g., "Mon,Tue,Wed"
 * @returns {object} - { originalSalary, dailySalary, netSalary, absenceDays, totalWorkingDays }
 */
export const calculateNetSalary = (monthlySalary, absences, workingDaysSchedule) => {
    const salary = Number(monthlySalary || 0);
    const absenceDays = Number(absences || 0);

    if (salary <= 0) {
        return {
            originalSalary: 0,
            dailySalary: 0,
            netSalary: 0,
            absenceDays,
            totalWorkingDays: 0,
            deduction: 0
        };
    }

    const totalWorkingDays = getTotalWorkingDaysInMonth(workingDaysSchedule);

    // Daily Salary = Monthly Salary ÷ Total working days
    const dailySalary = salary / totalWorkingDays;

    // Deduction = Daily Salary × Absence Days
    const deduction = dailySalary * absenceDays;

    // Net Salary = Monthly Salary - Deduction (minimum 0)
    const netSalary = Math.max(0, salary - deduction);

    return {
        originalSalary: salary,
        dailySalary,
        netSalary,
        absenceDays,
        totalWorkingDays,
        deduction
    };
};
