// Script para criar 15 eventos de teste para hoje
Date today = Date.today();
List<Event> testEvents = new List<Event>();

// Criar 15 eventos distribuídos ao longo do dia
for(Integer i = 0; i < 15; i++) {
    Event evt = new Event();

    // Horários distribuídos das 8h às 18h (intervalos de 40 minutos)
    Integer totalMinutes = 8 * 60 + (i * 40); // Começar às 8h
    Integer startHour = totalMinutes / 60;
    Integer startMinute = Math.mod(totalMinutes, 60);

    // Garantir que não passe das 18h
    if(startHour >= 18) {
        startHour = 8 + Math.mod(i, 10); // Redistribuir entre 8h e 17h
        startMinute = Math.mod(i * 15, 60); // Intervalos de 15 min
    }

    DateTime startTime = DateTime.newInstance(today.year(), today.month(), today.day(), startHour, startMinute, 0);
    DateTime endTime = startTime.addHours(1); // 1 hora de duração

    evt.Subject = 'Evento de Teste ' + (i + 1);
    evt.StartDateTime = startTime;
    evt.EndDateTime = endTime;
    evt.Description = 'Evento criado automaticamente para teste do calendário - ' + (i + 1);

    testEvents.add(evt);
}

try {
    insert testEvents;
    System.debug('✅ Criados ' + testEvents.size() + ' eventos de teste com sucesso!');
    
    // Mostrar os eventos criados
    for(Event evt : testEvents) {
        System.debug('📅 ' + evt.Subject + ' - ' + evt.StartDateTime.format('HH:mm') + ' às ' + evt.EndDateTime.format('HH:mm'));
    }
    
} catch(Exception e) {
    System.debug('❌ Erro ao criar eventos: ' + e.getMessage());
}
