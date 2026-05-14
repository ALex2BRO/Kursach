import { Storage } from './storage.js';

export class HabitManager {
  constructor() {
    this.habits = Storage.getHabits();
  }

  reload() {
    this.habits = Storage.getHabits();
  }

  addHabit(name, time, createdDate = new Date().toISOString().split('T')[0], options = {}) {
    if (!name || !name.trim()) throw new Error('Название не может быть пустым');
    const trimmed = name.trim();
    if (this.habits.some(h => h.name === trimmed)) {
      throw new Error('Привычка с таким названием уже существует');
    }
    if (!this._isValidDate(createdDate)) {
      createdDate = new Date().toISOString().split('T')[0];
    }
    const habit = {
      id: Date.now(),
      name: trimmed,
      time: time || '',
      createdDate,
      completedDates: [],
      repeatType: options.repeatType || 'once',
      weekdays: options.weekdays || [],
      intervalValue: options.intervalValue || 2,
      intervalUnit: options.intervalUnit || 'days',
      reminderCount: parseInt(options.reminderCount) || 0,
      reminderBefore: parseInt(options.reminderBefore) || 5
    };
    this.habits.push(habit);
    this._save();
    return habit;
  }

  deleteHabit(id) {
    this.habits = this.habits.filter(h => h.id !== id);
    this._save();
  }

  updateHabit(id, updates) {
    const habit = this.habits.find(h => h.id === id);
    if (!habit) throw new Error('Привычка не найдена');
    if (updates.name !== undefined && updates.name.trim() !== '') {
      const trimmed = updates.name.trim();
      if (this.habits.some(h => h.id !== id && h.name === trimmed)) {
        throw new Error('Привычка с таким названием уже существует');
      }
      habit.name = trimmed;
    }
    if (updates.time !== undefined) habit.time = updates.time;
    if (updates.repeatType !== undefined) habit.repeatType = updates.repeatType;
    if (updates.weekdays !== undefined) habit.weekdays = updates.weekdays;
    if (updates.intervalValue !== undefined) habit.intervalValue = parseInt(updates.intervalValue) || 2;
    if (updates.intervalUnit !== undefined) habit.intervalUnit = updates.intervalUnit;
    if (updates.reminderCount !== undefined) habit.reminderCount = parseInt(updates.reminderCount) || 0;
    if (updates.reminderBefore !== undefined) habit.reminderBefore = parseInt(updates.reminderBefore) || 5;
    this._save();
  }

  toggleCompletion(habitId, date) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return;
    if (!this._isValidDate(date)) return;
    const idx = habit.completedDates.indexOf(date);
    if (idx === -1) {
      habit.completedDates.push(date);
    } else {
      habit.completedDates.splice(idx, 1);
    }
    this._save();
  }

  getStats(habitId) {
    const habit = this.habits.find(h => h.id === habitId);
    if (!habit) return null;
    const dates = [...habit.completedDates].sort();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 6);
    const weekDates = this._getDatesInRange(weekAgo, today);
    const weekCompleted = dates.filter(d => weekDates.includes(d)).length;
    const weekPercent = weekDates.length > 0 ? (weekCompleted / weekDates.length) * 100 : 0;

    const monthAgo = new Date();
    monthAgo.setDate(monthAgo.getDate() - 29);
    const monthDates = this._getDatesInRange(monthAgo, today);
    const monthCompleted = dates.filter(d => monthDates.includes(d)).length;
    const monthPercent = monthDates.length > 0 ? (monthCompleted / monthDates.length) * 100 : 0;

    let streak = 0;
    let checkDate = new Date();
    if (!dates.includes(todayStr)) {
      checkDate.setDate(checkDate.getDate() - 1);
    }
    while (true) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dates.includes(dateStr)) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }

    const created = habit.createdDate;
    const daysSinceCreated = Math.max(1, Math.ceil((today - new Date(created)) / (1000 * 60 * 60 * 24)));
    const totalPercent = Math.min(100, (dates.length / daysSinceCreated) * 100);

    return { weekPercent, monthPercent, streak, totalPercent };
  }

  getTopHabits(limit = 5) {
    const withStats = this.habits.map(h => ({
      ...h,
      stats: this.getStats(h.id)
    }));
    return withStats
      .filter(h => h.stats !== null)
      .sort((a, b) => b.stats.totalPercent - a.stats.totalPercent)
      .slice(0, limit);
  }

  resetAllStats() {
    this.habits.forEach(h => { h.completedDates = []; });
    this._save();
  }

  _save() {
    Storage.saveHabits(this.habits);
  }

  _isValidDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return false;
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateStr)) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime());
  }

  _getDatesInRange(start, end) {
    const dates = [];
    let current = new Date(start);
    current.setHours(0, 0, 0, 0);
    const endDate = new Date(end);
    endDate.setHours(0, 0, 0, 0);
    while (current <= endDate) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }
}
