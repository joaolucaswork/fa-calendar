# Gerenciamento de Estado e Estratégias de Atualização

## Gerenciamento de Estado

O componente `calendarioReino` gerencia seu estado de forma reativa e performática através de:

*   **Propriedades Reativas (`@track`):** Propriedades do controller JS são marcadas com `@track` para garantir que a UI seja re-renderizada automaticamente quando seus valores mudam.
*   **Caches de Eventos Locais:**
    *   `this.allEvents`: Um array que armazena **todos** os eventos buscados do Salesforce para o período selecionado. Serve como a "fonte da verdade" local.
    *   `this.events`: Um array que contém os eventos a serem exibidos no calendário **após a aplicação de filtros**. É este array que o FullCalendar utiliza como sua fonte de eventos.
    *   Esta separação permite que a filtragem seja uma operação rápida no lado do cliente, sem a necessidade de novas chamadas ao Apex.

## Estratégias de Atualização da UI

Após operações assíncronas (chamadas Apex para salvar ou excluir dados), o componente emprega uma estratégia de atualização robusta e sequencial para garantir a consistência visual e evitar condições de corrida. O padrão comum utiliza múltiplos `setTimeout` encadeados:

1.  **(Delay baixo, ~100ms): `refetchEvents()`**
    *   Busca novamente os eventos da fonte de dados do FullCalendar (que aponta para `this.events`). Isso atualiza imediatamente a UI com base no cache local. Em alguns casos, busca dados frescos do Salesforce (`refreshEventDataFromSalesforce`).

2.  **(Delay médio, ~300ms): Atualização de UI Auxiliar**
    *   Atualiza elementos secundários da UI que dependem dos dados dos eventos, como a legenda de cores (`updateColorLegendCounts()`) e os indicadores de disponibilidade de salas (`updateRoomAvailability()`.

3.  **(Delay alto, ~600ms): Re-renderização Completa**
    *   `rerenderEvents()`: Força o FullCalendar a redesenhar os elementos de evento existentes, o que é útil para aplicar novas classes CSS ou cores.
    *   `changeView(currentView.name)`: Frequentemente chamado em conjunto, força um refresh completo da visualização atual, garantindo que todas as alterações de dados e cores sejam refletidas corretamente.
	
4.  **(Delay final, ~900ms): Atualização de Módulos Dependentes**
    *   Atualiza outras partes da UI que podem depender dos dados frescos, como a lista de sugestões de reunião (`forceRefreshMeetingSuggestions()`).

Este padrão orquestrado garante que as atualizações ocorram na ordem correta, proporcionando uma experiência de usuário fluida e consistente.
