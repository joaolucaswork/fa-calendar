# Análise do Código: calendarioReino.js (Linhas 0401-0800)

**Observações e Detalhes de Funções:**

*   **Finalização da Configuração do FullCalendar:**
    *   Esta seção contém a maior parte do objeto de configuração passado para o FullCalendar.
    *   **`header`**: Define os botões e o título no cabeçalho do calendário (navegação, hoje, troca de visualização).
    *   **`views`**: Configurações específicas para cada visualização (`agendaWeek`, `agendaDay`, `month`), incluindo formato de hora e `columnHeaderFormat`.
    *   **`eventSources`**: Define a fonte de eventos, apontando para a função `fetchEventsFromSalesforce`, que é responsável por chamar o Apex.
    *   **Handlers de Interação:**
        *   `eventDrop` e `eventResize`: Lidam com a atualização de eventos após o usuário arrastar ou redimensionar. Abrem um popup de confirmação (`showDragDropConfirmationPopup`) antes de salvar as alterações.
        *   `viewRender`: Chamado sempre que a visualização ou o período de data muda. É usado para atualizar o título da página (`currentDateLabel`), gerar os dias na sidebar (`generateMonthDays`), e buscar novos eventos (`fetchEventsFromSalesforce`).
        *   `loading`: Controla o spinner de carregamento (`this.isLoading`).

*   **Busca de Eventos:**
    *   **`fetchEventsFromSalesforce(start, end, timezone, callback)`:**
        *   Função crucial que o FullCalendar chama para obter os dados dos eventos.
        *   Prepara os parâmetros (datas de início/fim, ID do calendário do usuário selecionado).
        *   Chama o método Apex `getEvents`.
        *   Processa a resposta: mapeia os dados do Apex para o formato que o FullCalendar espera, armazena os resultados em `this.allEvents` e `this.events`, e chama a função `callback` do FullCalendar com os eventos processados.
        *   Atualiza a legenda de cores (`updateColorLegendCounts`).
        *   Contém tratamento de erro robusto.

*   **Gerenciamento da Sidebar:**
    *   **`toggleSidebar()`**: Mostra ou esconde a sidebar com uma animação CSS.
    *   **`generateMonthDays()`**: Gera a grade de dias para o mini-calendário na sidebar com base no mês e ano atuais. Marca o dia de hoje e os dias selecionados.
    *   **`handleSidebarDateClick(event)`**: Navega o calendário principal para a data que foi clicada no mini-calendário da sidebar.
    *   **`handleSidebarMonthChange(event)`**: Lida com a navegação para o mês anterior/seguinte na sidebar.

*   **Filtragem:**
    *   **`handleFilterChange(event)`**: Manipulador para quando um filtro (ex: tipo de evento) é alterado. Atualiza o estado `selectedFilters`.
    *   **`applyFilters()`**:
        *   Filtra o array `this.allEvents` com base nos `selectedFilters`.
        *   O resultado é armazenado em `this.events`.
        *   Chama `this.calendar.fullCalendar('removeEvents')` e `this.calendar.fullCalendar('addEventSource', this.events)` para atualizar o calendário com os eventos filtrados.
        *   Atualiza a contagem na legenda de cores.

Este bloco de código é o coração da interação entre o FullCalendar e os dados do Salesforce, definindo como os eventos são buscados, filtrados e exibidos. A lógica da sidebar para navegação rápida também está contida aqui.
