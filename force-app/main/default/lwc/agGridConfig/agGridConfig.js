/**
 * Configurações para o AG-Grid
 * Centraliza as configurações e definições de colunas para o AG-Grid
 */

/**
 * Cria configurações padrão para o AG-Grid
 * @param {Object} localeText - Objeto de tradução para o idioma
 * @returns {Object} Configurações do grid
 */
const getDefaultGridOptions = (localeText) => {
    return {
        // Configuração de tema (usando o legado para compatibilidade com CSS)
        theme: 'legacy',
        
        // Aplicar as traduções do idioma fornecido
        localeText,
        
        // Configuração padrão para todas as colunas
        defaultColDef: {
            flex: 1,
            minWidth: 100,
            resizable: true,
            
            // Configuração de filtros
            filter: true,
            floatingFilter: false,
            
            // Configuração dos parâmetros de filtro
            filterParams: {
                // Permitir que o botão Cancel feche o popup
                closeOnApply: true,
                buttons: ['apply', 'cancel', 'reset']
            }
        },
        
        // Desabilitar movimentação de colunas
        suppressMovableColumns: true,
        
        // Melhorar comportamento de interação com filtros
        suppressMenuHide: true
    };
};

/**
 * Cria definições de colunas para um grid de contatos
 * @returns {Array} Array de definições de colunas
 */
const getContactColumnDefs = () => {
    return [
        { 
            headerName: 'Nome', 
            field: 'name',
            sortable: true,
            filter: 'agTextColumnFilter'
        },
        { 
            headerName: 'Telefone', 
            field: 'phone',
            sortable: true,
            filter: 'agTextColumnFilter'
        },
        { 
            headerName: 'Email', 
            field: 'email',
            sortable: true,
            filter: 'agTextColumnFilter'
        },
        { 
            headerName: 'Função', 
            field: 'role',
            sortable: true,
            filter: 'agTextColumnFilter'
        }
    ];
};

/**
 * Dados de exemplo para o grid de contatos
 */
const getSampleContactData = () => {
    return [
        { name: 'João Silva', phone: '(11) 98765-4321', email: 'joao.silva@example.com', role: 'Gerente' },
        { name: 'Maria Santos', phone: '(21) 91234-5678', email: 'maria.santos@example.com', role: 'Analista' },
        { name: 'Pedro Alves', phone: '(31) 99876-5432', email: 'pedro.alves@example.com', role: 'Desenvolvedor' },
        { name: 'Ana Ferreira', phone: '(41) 98765-1234', email: 'ana.ferreira@example.com', role: 'Designer' },
        { name: 'Carlos Pereira', phone: '(51) 92345-6789', email: 'carlos.pereira@example.com', role: 'Assistente' }
    ];
};

/**
 * Configura handlers de eventos personalizados para o grid
 * @param {Object} gridApi - API do grid
 * @param {Object} columnApi - API de colunas do grid
 * @returns {Object} Objeto com handlers configurados
 */
const setupEventHandlers = (gridApi, columnApi) => {
    return {
        /**
         * Handler para o evento de seleção de linha
         * @param {Object} event - Evento de seleção
         */
        onRowSelected: (event) => {
            const selectedRows = gridApi.getSelectedRows();
            console.log('Linhas selecionadas:', selectedRows);
        },
        
        /**
         * Handler para o evento de ordenação de coluna
         * @param {Object} event - Evento de ordenação
         */
        onSortChanged: (event) => {
            const sortModel = gridApi.getSortModel();
            console.log('Modelo de ordenação alterado:', sortModel);
        }
    };
};

export {
    getDefaultGridOptions,
    getContactColumnDefs,
    getSampleContactData,
    setupEventHandlers
};