/**
 * @description Color Constants - Centralized color definitions for Reino Capital calendar system
 * @author Reino Capital Development Team
 * @version 1.0.0
 * 
 * Provides shared color mappings, priority levels, and configuration constants
 * used across calendar components for consistent color management.
 * 
 * @example
 * import { COLOR_MAPPINGS, PRIORITY_LEVELS } from 'c/colorConstants';
 * 
 * const color = COLOR_MAPPINGS.categoryToColor['sala-principal'];
 * const priority = PRIORITY_LEVELS.CUSTOM;
 */

// ========================================
// COLOR PRIORITY LEVELS
// ========================================

/**
 * @description Color priority hierarchy for event color determination
 * @readonly
 */
export const PRIORITY_LEVELS = Object.freeze({
  CUSTOM: 1,
  STATUS: 2,
  ROOM: 3,
  DEFAULT: 4
});

// ========================================
// DEFAULT VALUES
// ========================================

/**
 * @description Default category for uncategorized events
 * @readonly
 */
export const DEFAULT_CATEGORY = 'sem-categoria';

/**
 * @description Default color for uncategorized events
 * @readonly
 */
export const DEFAULT_COLOR = '#8A8886';

// ========================================
// COLOR MAPPINGS
// ========================================

/**
 * @description Bidirectional color mappings for categories and hex values
 * @readonly
 */
export const COLOR_MAPPINGS = Object.freeze({
  colorToCategory: {
    '#f6e3d6': 'sala-principal',
    '#e3e7fb': 'sala-gabriel',
    '#d6f3e4': 'aconteceu',
    '#f9d6d4': 'nao-aconteceu',
    '#f8eec6': 'adiado',
    '#e6d7f0': 'reagendado',
    '#8a8886': 'sem-categoria'
  },
  categoryToColor: {
    'sala-principal': '#F6E3D6',
    'sala-gabriel': '#E3E7FB',
    'aconteceu': '#D6F3E4',
    'nao-aconteceu': '#F9D6D4',
    'adiado': '#F8EEC6',
    'reagendado': '#E6D7F0',
    'sem-categoria': '#8A8886'
  }
});

/**
 * @description Border color mappings for background colors
 * @readonly
 */
export const BORDER_COLOR_MAPPINGS = Object.freeze({
  '#F6E3D6': '#D2691E', // Light peach → Orange
  '#E3E7FB': '#4F6BED', // Light lavender → Blue
  '#D6F3E4': '#4BCA81', // Light mint → Green
  '#F9D6D4': '#C0392B', // Light pink → Red
  '#F8EEC6': '#926F1B', // Light cream → Gold
  '#E6D7F0': '#8E24AA', // Purple pastel → Darker purple
  '#8A8886': '#5D5B59'  // Gray → Darker gray
});

/**
 * @description Human-readable color names
 * @readonly
 */
export const COLOR_NAMES = Object.freeze({
  '#F6E3D6': 'Pêssego Claro (Sala Principal)',
  '#E3E7FB': 'Lavanda Claro (Sala do Gabriel)',
  '#D6F3E4': 'Verde Menta (Aconteceu)',
  '#F9D6D4': 'Rosa Claro (Não Aconteceu)',
  '#F8EEC6': 'Creme Dourado (Adiado)',
  '#E6D7F0': 'Roxo Pastel (Reagendado)',
  '#8A8886': 'Cinza (Sem Categoria)'
});

// ========================================
// STATUS AND ROOM MAPPINGS
// ========================================

/**
 * @description Status string to category mappings
 * @readonly
 */
export const STATUS_MAPPINGS = Object.freeze({
  'Cancelado': 'nao-aconteceu', // Maps to same color as "Não aconteceu" (red)
  'Adiado': 'adiado',
  'Reagendado': 'reagendado',
  'reuniaoAconteceu': 'aconteceu',
  'Reuniao aconteceu': 'aconteceu',
  'reuniaoNAconteceu': 'nao-aconteceu',
  'Reuniao não aconteceu': 'nao-aconteceu'
});

/**
 * @description Room string to category mappings
 * @readonly
 */
export const ROOM_MAPPINGS = Object.freeze({
  'salaprincipal': 'sala-principal',
  'sala principal': 'sala-principal',
  'salagabriel': 'sala-gabriel',
  'sala do gabriel': 'sala-gabriel'
});

// ========================================
// COLOR PICKER OPTIONS
// ========================================

/**
 * @description Predefined color options for color picker components
 * @readonly
 */
export const COLOR_PICKER_OPTIONS = Object.freeze([
  {
    label: 'Pêssego Claro (Sala Principal)',
    value: '#F6E3D6',
    category: 'sala-principal'
  },
  {
    label: 'Lavanda Claro (Sala do Gabriel)',
    value: '#E3E7FB',
    category: 'sala-gabriel'
  },
  {
    label: 'Verde Menta (Aconteceu)',
    value: '#D6F3E4',
    category: 'aconteceu'
  },
  {
    label: 'Rosa Claro (Não Aconteceu/Cancelado)',
    value: '#F9D6D4',
    category: 'nao-aconteceu'
  },
  {
    label: 'Creme Dourado (Adiado)',
    value: '#F8EEC6',
    category: 'adiado'
  },
  {
    label: 'Roxo Pastel (Reagendado)',
    value: '#E6D7F0',
    category: 'reagendado'
  }
]);