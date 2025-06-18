/**
 * @description Controlador para gerenciar eventos de reunião associados a oportunidades
 * Substitui a funcionalidade do fluxo compromissoPrimeiroContato.flow
 * @author Cascade
 */
public with sharing class ReuniaoController {
  /**
   * @description Cria um evento de reunião associado a uma oportunidade quando
   * esta é movida para o estágio "Primeira Reunião"
   * @param opportunityId Id da oportunidade
   * @return Event O evento criado ou encontrado
   */
  @AuraEnabled
  public static Event criarOuRecuperarEvento(String opportunityId) {
    // Recuperar a oportunidade com campos necessários, incluindo produtos relacionados
    Opportunity opp = [
      SELECT
        Id,
        OwnerId,
        AccountId,
        StageName,
        Name,
        (
          SELECT Id, Name, ProductCode, Product2.Name, Product2.Family
          FROM OpportunityLineItems
          LIMIT 1
        )
      FROM Opportunity
      WHERE Id = :opportunityId
      LIMIT 1
    ];

    // Verificar se a oportunidade está no estágio "Primeira Reunião"
    if (opp.StageName != 'Primeira Reunião') {
      throw new AuraHandledException(
        'O estágio da oportunidade está incorreto. Esta operação só pode ser realizada para oportunidades no estágio "Primeira Reunião".'
      );
    }

    // Buscar o contato principal da conta
    Contact contato;
    try {
      List<Contact> contatos = [
        SELECT Id, Name, Email, Phone
        FROM Contact
        WHERE AccountId = :opp.AccountId
        LIMIT 1
      ];

      if (contatos.isEmpty()) {
        throw new AuraHandledException(
          'Problema com contato: Não foi possível encontrar um contato associado a esta conta.'
        );
      }

      contato = contatos[0];
    } catch (Exception e) {
      throw new AuraHandledException(
        'Problema com contato: Não foi possível encontrar um contato válido para essa oportunidade.'
      );
    }

    // Verificar se já existe um evento para esta oportunidade e contato
    List<Event> eventosExistentes = [
      SELECT
        Id,
        Subject,
        StartDateTime,
        EndDateTime,
        Description,
        Location,
        WhoId,
        WhatId,
        OwnerId,
        salaReuniao__c
      FROM Event
      WHERE WhatId = :opportunityId AND WhoId = :contato.Id
      ORDER BY CreatedDate DESC
      LIMIT 1
    ];

    // Se já existir um evento, retorná-lo
    if (!eventosExistentes.isEmpty()) {
      // Garantir que o assunto do evento corresponda ao nome da oportunidade
      Event eventoExistente = eventosExistentes[0];
      if (eventoExistente.Subject != opp.Name) {
        eventoExistente.Subject = opp.Name;
        update eventoExistente;
      }
      return eventoExistente;
    }

    // Gerar o assunto da reunião apenas com o nome da oportunidade
    String assuntoReuniao = opp.Name;

    System.debug('Gerando assunto para evento de reunião...');
    System.debug('Oportunidade: ' + opp.Name);
    System.debug('Usando nome da oportunidade como assunto: ' + assuntoReuniao);

    System.debug('Assunto gerado: ' + assuntoReuniao);

    // Caso contrário, criar um novo evento
    Event novoEvento = new Event(
      Subject = assuntoReuniao,
      StartDateTime = Datetime.now(),
      EndDateTime = Datetime.now().addMinutes(30),
      WhatId = opportunityId,
      WhoId = contato.Id,
      OwnerId = opp.OwnerId,
      Description = 'Reunião inicial para apresentação e discussão de oportunidades.'
    );

    // Set default meeting type for automated events
    try {
      novoEvento.put('tipoReuniao__c', 'Reunião Presencial');
    } catch (Exception e) {
      // Field may not be accessible, continue without setting
      System.debug('Could not set tipoReuniao__c field: ' + e.getMessage());
    }

    try {
      insert novoEvento;

      // Recuperar o evento inserido com todos os campos
      return [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          OwnerId
        FROM Event
        WHERE Id = :novoEvento.Id
        LIMIT 1
      ];
    } catch (Exception e) {
      throw new AuraHandledException('Erro ao criar evento: ' + e.getMessage());
    }
  }

  /**
   * @description Atualiza os detalhes de um evento existente
   * @param eventoId Id do evento a ser atualizado
   * @param assunto Novo assunto do evento
   * @param dataInicio Nova data de início
   * @param dataFim Nova data de fim
   * @param descricao Nova descrição
   * @param localizacao Nova localização
   * @return Event O evento atualizado
   */
  @AuraEnabled
  public static Event atualizarEvento(Map<String, Object> eventoData) {
    try {
      String eventoId = (String) eventoData.get('eventoId');

      // Buscar o evento com os campos relacionados para que possamos manter o Subject
      Event evento = [
        SELECT Id, WhatId, WhoId
        FROM Event
        WHERE Id = :eventoId
        LIMIT 1
      ];

      // Usar o assunto fornecido pelo cliente diretamente
      String assuntoEnviado = (String) eventoData.get('assunto');
      if (String.isNotBlank(assuntoEnviado)) {
        evento.Subject = assuntoEnviado;
        System.debug('Assunto atualizado para: ' + assuntoEnviado);
      }

      // Conversão segura de String para Datetime usando JSON deserialization
      String dataInicioStr = (String) eventoData.get('dataInicio');
      String dataFimStr = (String) eventoData.get('dataFim');

      if (dataInicioStr != null) {
        try {
          // Determinar se a string de data já está formatada corretamente para JSON deserialization
          String formattedDateStr = dataInicioStr;
          if (!dataInicioStr.startsWith('"') && !dataInicioStr.endsWith('"')) {
            formattedDateStr = '"' + dataInicioStr + '"';
          }

          // Conversão de ISO String para formato compativel com Apex
          evento.StartDateTime = (Datetime) JSON.deserialize(
            formattedDateStr,
            Datetime.class
          );
          System.debug('Data início parseada: ' + evento.StartDateTime);
        } catch (Exception e) {
          System.debug('Erro ao converter data de início: ' + e.getMessage());
          throw new AuraHandledException(
            'Formato de data inválido para data de início: ' + dataInicioStr
          );
        }
      }

      if (dataFimStr != null) {
        try {
          // Determinar se a string de data já está formatada corretamente para JSON deserialization
          String formattedDateStr = dataFimStr;
          if (!dataFimStr.startsWith('"') && !dataFimStr.endsWith('"')) {
            formattedDateStr = '"' + dataFimStr + '"';
          }

          // Conversão de ISO String para formato compativel com Apex
          evento.EndDateTime = (Datetime) JSON.deserialize(
            formattedDateStr,
            Datetime.class
          );
          System.debug('Data fim parseada: ' + evento.EndDateTime);
        } catch (Exception e) {
          System.debug('Erro ao converter data de fim: ' + e.getMessage());
          throw new AuraHandledException(
            'Formato de data inválido para data de fim: ' + dataFimStr
          );
        }
      }

      evento.Description = (String) eventoData.get('descricao');
      evento.Location = (String) eventoData.get('localizacao');

      // Campos para o tipo de reunião e link (commented out due to permissions)
      // if (eventoData.containsKey('tipo')) {
      //   String tipo = (String) eventoData.get('tipo');
      //   // Usar os valores personalizados em português que já existem na org
      //   if (tipo == 'reuniaoOnline') {
      //     evento.Type = 'Reunião Online'; // Valor personalizado em português
      //   } else if (tipo == 'reuniaoPresencial') {
      //     evento.Type = 'Presencial'; // Valor personalizado em português
      //   } else if (tipo == 'reuniaoTelefone') {
      //     evento.Type = 'Telefone'; // Valor personalizado em português
      //   } else {
      //     evento.Type = 'Outro'; // Valor personalizado em português
      //   }
      // }

      // Campo para sala de reunião
      if (eventoData.containsKey('salaReuniao')) {
        String salaReuniao = (String) eventoData.get('salaReuniao');
        // Armazenar o valor no campo customizado salaReuniao__c
        evento.put('salaReuniao__c', salaReuniao);
      }

      if (eventoData.containsKey('linkReuniao')) {
        String linkReuniao = (String) eventoData.get('linkReuniao');
        // Store meeting link in Description field using utility class
        if (linkReuniao != null && linkReuniao != '') {
          String descricao = evento.Description != null
            ? evento.Description
            : '';
          // Use utility class to add link to description
          evento.Description = MeetingLinkUtils.addLinkToDescription(
            descricao,
            linkReuniao
          );
        }
      }

      update evento;

      // Recuperar o evento atualizado
      return [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          OwnerId
        FROM Event
        WHERE Id = :eventoId
        LIMIT 1
      ];
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao atualizar evento: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Recupera os eventos do usuário atual e eventos atribuídos ao usuário
   * @return List<Event> Lista de eventos filtrados
   */
  @AuraEnabled(cacheable=true)
  public static List<Event> getUserAppointments() {
    Id userId = UserInfo.getUserId();

    // Data de início: hoje
    Date dataInicio = Date.today();
    // Data de fim: 30 dias após hoje
    Date dataFim = dataInicio.addDays(30);

    // Campos a serem retornados
    String[] fields = new List<String>{
      'Id',
      'Subject',
      'Location',
      'StartDateTime',
      'EndDateTime',
      'Description',
      'OwnerId',
      'Owner.Name',
      'Status',
      'WhoId',
      'Who.Name',
      'Who.Type',
      'WhatId',
      'What.Name',
      'What.Type'
    };

    // Buscar eventos onde o usuário é o dono OU está atribuído como recurso
    List<Event> eventos = new List<Event>();
    try {
      // Eventos do usuário e atribuídos ao usuário
      // Eventos que o usuário é dono
      List<Event> eventosOwner = [
        SELECT
          Id,
          Subject,
          Location,
          StartDateTime,
          EndDateTime,
          Description,
          OwnerId,
          Owner.Name,
          WhoId,
          Who.Name,
          Who.Type,
          WhatId,
          What.Name,
          What.Type
        FROM Event
        WHERE
          OwnerId = :userId
          AND StartDateTime >= :dataInicio
          AND StartDateTime <= :dataFim
        ORDER BY StartDateTime ASC
        LIMIT 50
      ];

      // Eventos que o usuário está relacionado
      List<Id> eventIds = new List<Id>();
      for (EventRelation relation : [
        SELECT EventId
        FROM EventRelation
        WHERE RelationId = :userId
      ]) {
        eventIds.add(relation.EventId);
      }

      List<Event> eventosRelated = new List<Event>();
      if (!eventIds.isEmpty()) {
        eventosRelated = [
          SELECT
            Id,
            Subject,
            Location,
            StartDateTime,
            EndDateTime,
            Description,
            OwnerId,
            Owner.Name,
            WhoId,
            Who.Name,
            Who.Type,
            WhatId,
            What.Name,
            What.Type
          FROM Event
          WHERE
            Id IN :eventIds
            AND StartDateTime >= :dataInicio
            AND StartDateTime <= :dataFim
          ORDER BY StartDateTime ASC
          LIMIT 50
        ];
      }

      // Combinar as duas listas
      eventos = new List<Event>();
      eventos.addAll(eventosOwner);
      eventos.addAll(eventosRelated);

      return eventos;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar eventos: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Recupera os detalhes de um evento específico
   * @param eventoId Id do evento a ser recuperado
   * @return Event O evento encontrado
   */
  @AuraEnabled
  public static Event getEventoDetalhes(String eventoId) {
    try {
      return [
        SELECT
          Id,
          Subject,
          StartDateTime,
          EndDateTime,
          Description,
          Location,
          WhoId,
          WhatId,
          OwnerId,
          Who.Name,
          What.Name,
          Owner.Name
        FROM Event
        WHERE Id = :eventoId
        LIMIT 1
      ];
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar detalhes do evento: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Recupera detalhes relacionados à oportunidade para o modal de reunião
   * @param opportunityId Id da oportunidade
   * @return Map<String, Object> Mapa com detalhes da oportunidade, conta, contato e evento
   */
  @AuraEnabled
  public static Map<String, Object> getDetalhesReuniao(String opportunityId) {
    Map<String, Object> detalhes = new Map<String, Object>();

    try {
      // Buscar oportunidade com detalhes da conta e produtos relacionados
      Opportunity opp = [
        SELECT
          Id,
          Name,
          StageName,
          Amount,
          CloseDate,
          AccountId,
          OwnerId,
          Account.Name,
          Owner.Name,
          Probabilidade_da_Oportunidade__c,
          Type,
          (
            SELECT Id, Name, ProductCode, Product2.Name, Product2.Family
            FROM OpportunityLineItems
            LIMIT 1
          )
        FROM Opportunity
        WHERE Id = :opportunityId
        LIMIT 1
      ];

      // Processar os dados do produto para exibição
      if (!opp.OpportunityLineItems.isEmpty()) {
        OpportunityLineItem lineItem = opp.OpportunityLineItems[0];
        Map<String, Object> produtoInfo = new Map<String, Object>();
        produtoInfo.put('id', lineItem.Id);
        produtoInfo.put('name', lineItem.Name);
        produtoInfo.put('productCode', lineItem.ProductCode);
        produtoInfo.put('productName', lineItem.Product2?.Name);
        produtoInfo.put('productFamily', lineItem.Product2?.Family);
        detalhes.put('produto', produtoInfo);
      }

      detalhes.put('oportunidade', opp);

      // Buscar contato relacionado à conta
      List<Contact> contatos = [
        SELECT Id, Name, LastName, FirstName, Title, Email, Phone
        FROM Contact
        WHERE AccountId = :opp.AccountId
        LIMIT 1
      ];

      if (!contatos.isEmpty()) {
        detalhes.put('contato', contatos[0]);
      }

      // Buscar evento relacionado à oportunidade apenas se a oportunidade estiver no estágio 'Primeira Reunião'
      if (opp.StageName == 'Primeira Reunião') {
        List<Event> eventos = [
          SELECT
            Id,
            Subject,
            StartDateTime,
            EndDateTime,
            Description,
            Location,
            WhoId,
            WhatId,
            OwnerId,
            salaReuniao__c
          FROM Event
          WHERE WhatId = :opportunityId
          ORDER BY CreatedDate DESC
          LIMIT 1
        ];

        if (!eventos.isEmpty()) {
          detalhes.put('evento', eventos[0]);
        }
      }

      return detalhes;
    } catch (Exception e) {
      throw new AuraHandledException(
        'Erro ao recuperar detalhes para reunião: ' + e.getMessage()
      );
    }
  }

  /**
   * @description Valida se a sala de reunião está disponível no período solicitado
   * @param salaReuniao Código da sala de reunião (salaPrincipal, salaGabriel, etc)
   * @param dataInicio Data e hora de início da reunião
   * @param dataFim Data e hora de fim da reunião
   * @param eventoAtualId Id do evento atual (para ignorar na validação de atualização)
   * @return Map<String, Object> Mapa com status da validação e mensagem
   */
  @AuraEnabled
  public static Map<String, Object> validarDisponibilidadeSala(
    String salaReuniao,
    String dataInicioStr,
    String dataFimStr,
    String eventoAtualId
  ) {
    Map<String, Object> resultado = new Map<String, Object>();
    resultado.put('valido', true);
    resultado.put('mensagem', '');

    try {
      // Verificar se a sala foi selecionada
      if (String.isBlank(salaReuniao) || salaReuniao == 'Outra') {
        return resultado; // Não é necessário validar salas genéricas ou não selecionadas
      }

      // Converter strings de data para Datetime
      Datetime dataInicio;
      Datetime dataFim;

      try {
        dataInicio = (Datetime) JSON.deserialize(
          '"' + dataInicioStr + '"',
          Datetime.class
        );
        dataFim = (Datetime) JSON.deserialize(
          '"' + dataFimStr + '"',
          Datetime.class
        );
      } catch (Exception e) {
        resultado.put('valido', false);
        resultado.put('mensagem', 'Formato de data inválido');
        return resultado;
      }

      // Buscar eventos existentes que podem causar conflito
      // Updated: Use internal values consistently - database stores internal values, not display names
      String nomeSalaFormatado = getSalaDisplayName(salaReuniao);

      // Query para buscar eventos que possuem a mesma sala E têm sobreposição de horário
      // Updated: Use salaReuniao directly since database stores internal values
      String query =
        'SELECT Id, Subject, StartDateTime, EndDateTime, OwnerId, Owner.Name ' +
        'FROM Event ' +
        'WHERE salaReuniao__c = :salaReuniao ' +
        'AND Id != :eventoAtualId ' + // Ignorar o próprio evento na validação
        'AND (' +
        // Evento existente começa durante o novo evento
        '(StartDateTime >= :dataInicio AND StartDateTime < :dataFim) ' +
        // Evento existente termina durante o novo evento
        'OR (EndDateTime > :dataInicio AND EndDateTime <= :dataFim) ' +
        // Evento existente engloba o novo evento
        'OR (StartDateTime <= :dataInicio AND EndDateTime >= :dataFim)' +
        ')';

      List<Event> eventosConflitantes = Database.query(query);

      if (!eventosConflitantes.isEmpty()) {
        Event primeiroConflito = eventosConflitantes[0];
        String formatoData = 'dd/MM/yyyy HH:mm';

        resultado.put('valido', false);
        String nomeCriador = primeiroConflito.Owner.Name != null
          ? primeiroConflito.Owner.Name
          : 'Usuário desconhecido';

        resultado.put(
          'mensagem',
          'Opa! A ' +
            nomeSalaFormatado +
            ' já está reservada nesse horário. ' +
            'Organizada por: ' +
            nomeCriador +
            ' | Horário: ' +
            primeiroConflito.StartDateTime.format(formatoData) +
            ' até ' +
            primeiroConflito.EndDateTime.format(formatoData) +
            '.'
        );

        resultado.put('eventosConflitantes', eventosConflitantes);
      }

      return resultado;
    } catch (Exception e) {
      resultado.put('valido', false);
      resultado.put(
        'mensagem',
        'Erro ao validar disponibilidade da sala: ' + e.getMessage()
      );
      return resultado;
    }
  }

  /**
   * @description Helper method to get display name for room internal values
   * @param salaReuniao Internal room value stored in database
   * @return String Display name for the room
   */
  private static String getSalaDisplayName(String salaReuniao) {
    // Updated mapping: Database stores internal values, this method converts to display names for UI
    if (salaReuniao == 'salaPrincipal') {
      return 'Sala Principal';
    } else if (salaReuniao == 'salaGabriel') {
      return 'Sala do Gabriel';
    } else if (salaReuniao == 'Outra') {
      return 'Outra';
    } else if (salaReuniao == 'online') {
      return 'Online';
    } else {
      return salaReuniao; // Return as-is for unknown values
    }
  }
}