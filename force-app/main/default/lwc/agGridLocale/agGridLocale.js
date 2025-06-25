/**
 * Fornece traduções para o AG-Grid em diferentes idiomas
 */

/**
 * Tradução para português do AG-Grid
 */
const ptBR = {
    // Texto para o cabeçalho do filtro
    page: 'Página',
    more: 'Mais',
    to: 'até',
    of: 'de',
    next: 'Próximo',
    last: 'Último',
    first: 'Primeiro',
    previous: 'Anterior',
    loadingOoo: 'Carregando...',
    
    // Texto para os filtros
    filterOoo: 'Filtrar...',
    applyFilter: 'Aplicar',
    clearFilter: 'Limpar',
    resetFilter: 'Resetar',
    equals: 'Igual a',
    notEqual: 'Diferente de',
    lessThan: 'Menor que',
    greaterThan: 'Maior que',
    lessThanOrEqual: 'Menor ou igual a',
    greaterThanOrEqual: 'Maior ou igual a',
    inRange: 'No intervalo',
    contains: 'Contém',
    notContains: 'Não contém',
    startsWith: 'Começa com',
    endsWith: 'Termina com',
    andCondition: 'E',
    orCondition: 'OU',
    filterValueText: 'Valor do filtro',
    
    // Texto para o menu de colunas
    columns: 'Colunas',
    selectAll: 'Selecionar Tudo',
    
    // Texto para exportação
    export: 'Exportar',
    
    // Texto para o estado sem dados
    noRowsToShow: 'Sem dados para exibir',
    
    // Texto para botões padrão
    cancel: 'Cancelar',
    apply: 'Aplicar',
    reset: 'Redefinir',
    
    // Texto para validação
    invalidDate: 'Data inválida',
    invalidNumber: 'Número inválido',
    
    // Outros textos comuns
    search: 'Buscar',
    blanks: 'Em branco',
    dateFormatOoo: 'dd/mm/yyyy',
    true: 'Verdadeiro',
    false: 'Falso'
};

/**
 * Tradução para inglês do AG-Grid (padrão)
 */
const enUS = {};

/**
 * Retorna a tradução com base no código de idioma
 * @param {string} locale - Código do idioma (pt-BR, en-US, etc.)
 * @returns {Object} Objeto de tradução para o idioma especificado
 */
const getLocaleText = (locale) => {
    switch (locale.toLowerCase()) {
        case 'pt-br':
        case 'pt':
            return ptBR;
        case 'en-us':
        case 'en':
        default:
            return enUS;
    }
};

export { 
    ptBR,
    enUS,
    getLocaleText
};