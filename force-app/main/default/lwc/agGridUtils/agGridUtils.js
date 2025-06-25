/**
 * Utilitário para o AG-Grid
 * Contém funções auxiliares e utilitários para o AG-Grid
 */

// Configuração de log para depuração
const logger = {
    info: (message, ...args) => {
        console.info(`[AG-Grid] ${message}`, ...args);
    },
    error: (message, ...args) => {
        console.error(`[AG-Grid Error] ${message}`, ...args);
    }
};

/**
 * Carrega um recurso estático do Salesforce
 * @param {string} url - URL do recurso estático
 * @returns {Promise} Promessa que resolve quando o recurso é carregado
 */
const loadResource = (url) => {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = url;
        script.onload = () => resolve(script);
        script.onerror = (error) => reject(new Error(`Falha ao carregar o script: ${url}`));
        document.head.appendChild(script);
    });
};

/**
 * Carrega uma folha de estilo CSS
 * @param {string} url - URL da folha de estilo
 * @returns {Promise} Promessa que resolve quando o CSS é carregado
 */
const loadStylesheet = (url) => {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.href = url;
        link.type = 'text/css';
        link.rel = 'stylesheet';
        link.onload = () => resolve(link);
        link.onerror = () => reject(new Error(`Falha ao carregar o CSS: ${url}`));
        document.head.appendChild(link);
    });
};

/**
 * Verifica se o AG-Grid já está carregado no DOM
 * @returns {boolean} Verdadeiro se o AG-Grid já estiver carregado
 */
const isAgGridLoaded = () => {
    return typeof window.agGrid !== 'undefined';
};

/**
 * Configura o manipulador de interação com filtros
 * @param {Object} component - Referência ao componente LWC
 * @param {Function} handleFilterElementClick - Função de manipulação de cliques
 * @returns {Object} Objeto com funções para aplicar e remover manipuladores de eventos
 */
const setupFilterInteraction = (component, handleFilterElementClick) => {
    // Objetos para rastrear observadores e elementos
    const state = {
        mainObserver: null,
        subObservers: [],
        elementsWithListeners: [],
        popupsWithListeners: []
    };

    /**
     * Aplica manipuladores de eventos a um único elemento
     * @param {HTMLElement} element - Elemento para aplicar manipuladores
     */
    const applyEventHandlersToElement = (element) => {
        if (!element || element.nodeType !== 1) return; // Garante que é um nó de elemento
        
        try {
            // Aplica manipuladores de clique e mousedown
            element.addEventListener('click', handleFilterElementClick);
            element.addEventListener('mousedown', handleFilterElementClick);
            
            // Para elementos select e option, adiciona manipulador de change
            if (element.tagName === 'SELECT' || element.tagName === 'OPTION') {
                element.addEventListener('change', handleFilterElementClick);
            }
            
            // Para checkboxes e radio buttons, adiciona manipulador de change
            if ((element.tagName === 'INPUT' && 
                 (element.type === 'checkbox' || element.type === 'radio')) ||
                element.classList.contains('ag-checkbox') ||
                element.classList.contains('ag-radio-button')) {
                element.addEventListener('change', handleFilterElementClick);
            }
            
            // Rastreia este elemento para limpeza
            state.elementsWithListeners.push(element);
        } catch (error) {
            logger.error('Erro ao aplicar manipuladores de eventos ao elemento:', error);
        }
    };

    /**
     * Escaneia um container para todos os elementos interativos e aplica manipuladores de eventos
     * @param {HTMLElement} container - Elemento container para escanear
     */
    const scanAndApplyToAllInteractiveElements = (container) => {
        if (!container) return;
        
        try {
            // Primeiro, aplica ao próprio container
            applyEventHandlersToElement(container);
            
            // Seletor abrangente para todos os tipos de elementos interativos
            const interactiveSelector = 'input, button, select, option, a, .ag-virtual-list-item, ' + 
                                      '.ag-select-item, .ag-tab, .ag-filter-virtual-list-item, ' +
                                      '.ag-filter-filter, .ag-checkbox, .ag-radio-button, li';
                                      
            const interactiveElements = container.querySelectorAll(interactiveSelector);
            
            interactiveElements.forEach(element => {
                applyEventHandlersToElement(element);
            });
            
            logger.info(`Aplicados manipuladores de eventos a ${interactiveElements.length} elementos no container`);
        } catch (error) {
            logger.error('Erro ao escanear elementos interativos:', error);
        }
    };

    /**
     * Aplica manipuladores de eventos ao popup de filtro
     * @param {HTMLElement} popupElement - Elemento do popup de filtro
     */
    const applyPopupEventHandlers = (popupElement) => {
        try {
            // Aplica manipuladores ao próprio elemento do popup
            applyEventHandlersToElement(popupElement);
            
            // Escaneia todos os elementos interativos e aplica manipuladores
            scanAndApplyToAllInteractiveElements(popupElement);
            
            // Adiciona um manipulador de clique especial ao popup inteiro
            popupElement.addEventListener('click', (event) => {
                // Sempre impede propagação para cliques dentro do popup
                event.stopPropagation();
                // Permite que o evento borbulhe dentro do popup, mas não para fora
                logger.info('Clique interceptado no container do popup');
            });
            
            // Rastreia este elemento para limpeza
            state.popupsWithListeners.push(popupElement);
            
            // Configura um subobservador para observar elementos adicionados a este popup
            const subObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        // Aplica manipuladores a nós recém-adicionados
                        mutation.addedNodes.forEach(node => {
                            if (node.nodeType === 1) { // Nó de elemento
                                applyEventHandlersToElement(node);
                                scanAndApplyToAllInteractiveElements(node);
                            }
                        });
                    }
                });
            });
            
            // Começa a observar este popup para mudanças
            subObserver.observe(popupElement, {
                childList: true,
                subtree: true
            });
            
            // Armazena observador para limpeza
            state.subObservers.push(subObserver);
            
            logger.info(`Configurado monitoramento abrangente para popup: ${popupElement.className}`);
        } catch (error) {
            logger.error('Erro ao aplicar manipuladores de eventos ao popup:', error);
        }
    };

    /**
     * Manipula cliques no container da grid para evitar o fechamento do popup
     * @param {Event} event - O evento de clique
     */
    const handleGridContainerClick = (event) => {
        // Verifica se o clique está dentro de um popup de filtro ou dropdown
        let target = event.target;
        let isInsidePopup = false;
        
        // Percorre o DOM para verificar se estamos dentro de um popup de filtro
        while (target && target !== component.template.querySelector('div[data-id="agGrid"]')) {
            if (target.classList && (
                target.classList.contains('ag-popup') || 
                target.classList.contains('ag-filter') ||
                target.classList.contains('ag-menu') ||
                target.classList.contains('ag-select') ||
                target.classList.contains('ag-tabs') ||
                target.classList.contains('ag-virtual-list-item') ||
                target.classList.contains('ag-filter-virtual-list-item'))) {
                isInsidePopup = true;
                break;
            }
            target = target.parentNode;
        }
        
        // Se estivermos dentro de um popup, impede a propagação
        if (isInsidePopup) {
            logger.info('Clique interceptado dentro do popup/dropdown de filtro');
            event.stopPropagation();
        }
    };

    /**
     * Configura a correção de interação com o popup de filtro
     * @param {String} gridSelector - Seletor para o container da grid
     */
    const fixFilterPopupInteraction = (gridSelector) => {
        logger.info('Aplicando correção aprimorada de interação com popup de filtro');
        
        try {
            // Mantém o controle do popup ativo para aplicar manipuladores de eventos a elementos adicionados dinamicamente
            let activePopup = null;
            
            // Usa MutationObserver para detectar quando popups de filtro são adicionados ao DOM
            state.mainObserver = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    // Verifica popups adicionados
                    if (mutation.addedNodes && mutation.addedNodes.length > 0) {
                        mutation.addedNodes.forEach((node) => {
                            // Manipula popups de filtro
                            if (node.classList && 
                                (node.classList.contains('ag-popup') || 
                                 node.classList.contains('ag-filter') ||
                                 node.classList.contains('ag-menu'))) {
                                logger.info('Popup de filtro detectado:', node.className);
                                activePopup = node;
                                applyPopupEventHandlers(node);
                            }
                            
                            // Manipula opções de dropdown e sugestões de autocompletar
                            if (node.classList && 
                                (node.classList.contains('ag-virtual-list-item') ||
                                 node.classList.contains('ag-select-item') ||
                                 node.tagName === 'OPTION' ||
                                 node.classList.contains('ag-filter-virtual-list-item'))) {
                                logger.info('Item de dropdown ou autocompletar detectado:', node.className || node.tagName);
                                applyEventHandlersToElement(node);
                            }
                        });
                    }
                    
                    // Manipula mudanças de atributos que podem criar novos elementos de dropdown
                    if (mutation.type === 'attributes' && activePopup) {
                        // Reaplicar manipuladores a quaisquer novos elementos que possam ter sido adicionados via mudanças de atributos
                        setTimeout(() => {
                            scanAndApplyToAllInteractiveElements(activePopup);
                        }, 0);
                    }
                });
            });
            
            // Configura um observador mais abrangente que observa todas as mudanças
            const observerConfig = {
                childList: true,   // Observa nós adicionados/removidos
                subtree: true,     // Observa toda a subárvore
                attributes: true,  // Observa mudanças de atributos
                attributeFilter: ['class', 'style', 'open'] // Apenas atributos específicos
            };
            
            // Começa a observar o container da grid
            const gridContainer = component.template.querySelector(gridSelector);
            if (gridContainer) {
                state.mainObserver.observe(gridContainer, observerConfig);
                logger.info('Observador aprimorado de popup de filtro inicializado');
                
                // Adiciona um manipulador de eventos global ao próprio container da grid
                gridContainer.addEventListener('click', handleGridContainerClick);
                gridContainer.addEventListener('mousedown', handleGridContainerClick);
            }
        } catch (error) {
            logger.error('Erro ao configurar correção de popup de filtro:', error);
        }
    };

    /**
     * Remove os ouvintes de eventos para evitar vazamentos de memória
     */
    const removeFilterPopupListeners = () => {
        try {
            // Desconecta o observador principal
            if (state.mainObserver) {
                state.mainObserver.disconnect();
                logger.info('Observador principal de filtro desconectado');
            }
            
            // Desconecta sub-observadores
            if (state.subObservers && state.subObservers.length > 0) {
                state.subObservers.forEach(observer => observer.disconnect());
                logger.info(`Desconectados ${state.subObservers.length} sub-observadores`);
                state.subObservers = [];
            }
            
            // Remove ouvintes de eventos do container da grid
            const gridContainer = component.template.querySelector('div[data-id="agGrid"]');
            if (gridContainer) {
                gridContainer.removeEventListener('click', handleGridContainerClick);
                gridContainer.removeEventListener('mousedown', handleGridContainerClick);
                logger.info('Removidos ouvintes de eventos do container da grid');
            }
            
            // Remove ouvintes de eventos dos containers de popup
            if (state.popupsWithListeners && state.popupsWithListeners.length > 0) {
                state.popupsWithListeners.forEach(popup => {
                    // Remove o manipulador de clique geral
                    popup.removeEventListener('click', handleFilterElementClick);
                });
                logger.info(`Removidos ouvintes de eventos de ${state.popupsWithListeners.length} popups`);
                state.popupsWithListeners = [];
            }
            
            // Remove ouvintes de eventos de elementos individuais
            if (state.elementsWithListeners && state.elementsWithListeners.length > 0) {
                state.elementsWithListeners.forEach(element => {
                    if (element && element.removeEventListener) {
                        element.removeEventListener('click', handleFilterElementClick);
                        element.removeEventListener('mousedown', handleFilterElementClick);
                        element.removeEventListener('change', handleFilterElementClick);
                    }
                });
                logger.info(`Removidos ouvintes de eventos de ${state.elementsWithListeners.length} elementos`);
                state.elementsWithListeners = [];
            }
        } catch (error) {
            logger.error('Erro ao remover ouvintes de popup de filtro:', error);
        }
    };

    return {
        fixFilterPopupInteraction,
        removeFilterPopupListeners
    };
};

export { 
    logger, 
    loadResource, 
    loadStylesheet, 
    isAgGridLoaded,
    setupFilterInteraction
};