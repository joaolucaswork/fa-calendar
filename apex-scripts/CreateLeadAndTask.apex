// Apex Script for Execute Anonymous Window - calendarioScratch Org
// Creates a Lead record with custom fields from sandReino and an associated Task
// Optimized version with reduced debug output to avoid header size limits

try {
  System.debug(
    'Starting Lead and Task Creation Script for calendarioScratch org'
  );

  // STEP 1: CREATE LEAD RECORD
  Lead newLead = new Lead();

  // REQUIRED FIELDS (Standard Salesforce)
  newLead.LastName = 'Silva';
  newLead.FirstName = 'João';
  newLead.Company = 'Empresa Teste Ltda';

  // CONTACT INFORMATION
  newLead.Email = 'joao.silva@empresateste.com';
  newLead.Phone = '(11) 99999-9999';
  newLead.MobilePhone = '(11) 98888-7777';

  // LEAD STATUS AND CLASSIFICATION
  newLead.Status = 'Open - Not Contacted';
  newLead.classificacaoLead__c = 'Interessado';

  // LEAD TYPE AND IDENTIFICATION
  newLead.TipoDeLead__c = 'CPF';
  newLead.CPF_Lead__c = '123.456.789-00';
  newLead.RG_Lead__c = '12.345.678-9';

  // PERSONAL INFORMATION
  newLead.EstadoCivil_Lead__c = 'Solteiro';
  newLead.Profissao_Lead__c = 'Engenheiro';

  // FINANCIAL INFORMATION
  newLead.PatrimonioFinanceiro_Lead__c = 500000.00;
  newLead.PatrimonioImobilizado_Lead__c = 200000.00;
  newLead.maisdeMilhao__c = false;

  // SYSTEM FIELDS
  newLead.DataRegistro_Lead__c = Date.today();
  newLead.chamadaRegistrada__c = false;
  newLead.naoAtendeu__c = false;
  newLead.quantasVezesLeadNaoAtendeu__c = 0;

  // ADDITIONAL CONTACT INFO
  newLead.emailEmpresarial__c = 'joao.silva@empresateste.com.br';
  newLead.EmailAdicional_Lead__c = 'joao.adicional@empresateste.com';

  // ADDRESS INFORMATION
  newLead.ComplementoEndereco_Lead__c = 'Apto 45';

  // LEAD SOURCE AND ORIGIN
  newLead.LeadSource = 'Web';
  newLead.Originacao_Lead__c = 'Site';

  // ADDITIONAL FIELDS
  newLead.Atribuir__c = false;
  newLead.TaxaNegociada_Lead__c = 2.5;

  // STANDARD FIELDS
  newLead.Industry = 'Technology';
  newLead.Rating = 'Warm';

  System.debug(
    'Lead object created: ' +
      newLead.FirstName +
      ' ' +
      newLead.LastName +
      ' - ' +
      newLead.Company
  );

  // Insert the Lead record
  insert newLead;

  System.debug('SUCCESS: Lead created successfully!');
  System.debug('Lead ID: ' + newLead.Id);

  // STEP 2: CREATE TASK RECORD

  Task newTask = new Task();

  // Link Task to the newly created Lead using WhoId
  newTask.WhoId = newLead.Id;

  // Set Task Type and TaskSubtype to "Call"
  newTask.Type = 'Call';
  newTask.TaskSubtype = 'Call';

  // Set meaningful Subject
  newTask.Subject = 'Chamada';

  // Set Task Status
  newTask.Status = 'Not Started';

  // Set Priority
  newTask.Priority = 'Normal';

  // Set Activity Date (Due Date) to today
  newTask.ActivityDate = Date.today();

  // Optional: Add description
  newTask.Description = 'Tarefa de follow-up criada automaticamente para o Lead interessado.';

  System.debug(
    'Task object created: ' + newTask.Subject + ' for Lead ID: ' + newTask.WhoId
  );

  // Insert the Task record
  insert newTask;

  System.debug('SUCCESS: Task created successfully!');
  System.debug('Task ID: ' + newTask.Id);

  // STEP 3: VERIFICATION QUERIES

  // Query the created Lead to verify all fields
  Lead createdLead = [
    SELECT
      Id,
      FirstName,
      LastName,
      Company,
      Email,
      Phone,
      MobilePhone,
      Status,
      classificacaoLead__c,
      TipoDeLead__c,
      CPF_Lead__c,
      RG_Lead__c,
      EstadoCivil_Lead__c,
      Profissao_Lead__c,
      PatrimonioFinanceiro_Lead__c,
      PatrimonioImobilizado_Lead__c,
      maisdeMilhao__c,
      DataRegistro_Lead__c,
      chamadaRegistrada__c,
      naoAtendeu__c,
      quantasVezesLeadNaoAtendeu__c,
      emailEmpresarial__c,
      EmailAdicional_Lead__c,
      ComplementoEndereco_Lead__c,
      LeadSource,
      Originacao_Lead__c,
      Atribuir__c,
      TaxaNegociada_Lead__c,
      Industry,
      Rating,
      CreatedDate
    FROM Lead
    WHERE Id = :newLead.Id
  ];

  System.debug('LEAD VERIFICATION: Lead created successfully');
  System.debug(
    'Lead ID: ' +
      createdLead.Id +
      ' | Name: ' +
      createdLead.FirstName +
      ' ' +
      createdLead.LastName
  );
  System.debug(
    'Company: ' + createdLead.Company + ' | Email: ' + createdLead.Email
  );
  System.debug(
    'Status: ' +
      createdLead.Status +
      ' | Classification: ' +
      createdLead.classificacaoLead__c
  );

  // Query the created Task to verify all fields
  Task createdTask = [
    SELECT
      Id,
      WhoId,
      Who.Name,
      Type,
      TaskSubtype,
      Subject,
      Status,
      Priority,
      ActivityDate,
      Description,
      CreatedDate
    FROM Task
    WHERE Id = :newTask.Id
  ];

  System.debug('TASK VERIFICATION: Task created successfully');
  System.debug(
    'Task ID: ' + createdTask.Id + ' | Related to Lead: ' + createdTask.Who.Name
  );
  System.debug(
    'Type: ' +
      createdTask.Type +
      ' | Subject: ' +
      createdTask.Subject +
      ' | Status: ' +
      createdTask.Status
  );

  System.debug('SCRIPT COMPLETED SUCCESSFULLY');
  System.debug('SUCCESS: Lead and Task created and verified successfully!');
} catch (DmlException e) {
  System.debug('ERROR: DML Exception occurred:');
  System.debug('Error Type: ' + e.getTypeName());
  System.debug('Error Message: ' + e.getMessage());
  System.debug('Line Number: ' + e.getLineNumber());

  // Loop through all DML errors
  for (Integer i = 0; i < e.getNumDml(); i++) {
    System.debug('DML Error ' + (i + 1) + ':');
    System.debug('  - Status Code: ' + e.getDmlStatusCode(i));
    System.debug('  - Message: ' + e.getDmlMessage(i));
    System.debug('  - Fields: ' + e.getDmlFields(i));
    System.debug('  - Record ID: ' + e.getDmlId(i));
  }
} catch (Exception e) {
  System.debug('ERROR: General Exception occurred:');
  System.debug('Error Type: ' + e.getTypeName());
  System.debug('Error Message: ' + e.getMessage());
  System.debug('Line Number: ' + e.getLineNumber());
  System.debug('Stack Trace: ' + e.getStackTraceString());
} finally {
  System.debug('Script execution completed');
}
