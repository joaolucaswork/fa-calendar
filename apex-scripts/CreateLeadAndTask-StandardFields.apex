// Apex Script for Execute Anonymous Window - calendarioScratch Org
// Creates a Lead record with STANDARD FIELDS ONLY and an associated Task
// Use this version when custom fields are not yet deployed to the org

try {
  System.debug('Starting Lead and Task Creation Script - STANDARD FIELDS ONLY');

  // STEP 1: CREATE LEAD RECORD WITH STANDARD FIELDS ONLY
  Lead newLead = new Lead();

  // REQUIRED FIELDS (Standard Salesforce)
  newLead.LastName = 'Silva';
  newLead.FirstName = 'João';
  newLead.Company = 'Empresa Teste Ltda';

  // CONTACT INFORMATION (Standard Fields)
  newLead.Email = 'joao.silva@empresateste.com';
  newLead.Phone = '(11) 99999-9999';
  newLead.MobilePhone = '(11) 98888-7777';

  // LEAD STATUS (Standard Field)
  newLead.Status = 'Open - Not Contacted';

  // LEAD SOURCE AND ORIGIN (Standard Fields)
  newLead.LeadSource = 'Web';

  // STANDARD FIELDS
  newLead.Industry = 'Technology';
  newLead.Rating = 'Warm';

  // ADDRESS INFORMATION (Standard Fields)
  newLead.Street = 'Rua das Flores, 123';
  newLead.City = 'São Paulo';
  newLead.State = 'SP';
  newLead.PostalCode = '01234-567';
  newLead.Country = 'Brazil';

  // ADDITIONAL STANDARD FIELDS
  newLead.Title = 'Engenheiro';
  newLead.Website = 'www.empresateste.com';
  newLead.Description = 'Lead criado via script Apex para teste';

  System.debug('Lead object created: ' + newLead.FirstName + ' ' + newLead.LastName + ' - ' + newLead.Company);

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
  newTask.Subject = 'Chamada de Follow-up';

  // Set Task Status
  newTask.Status = 'Not Started';

  // Set Priority
  newTask.Priority = 'Normal';

  // Set Activity Date (Due Date) to today
  newTask.ActivityDate = Date.today();

  // Optional: Add description
  newTask.Description = 'Tarefa de follow-up criada automaticamente para o Lead interessado.';

  System.debug('Task object created: ' + newTask.Subject + ' for Lead ID: ' + newTask.WhoId);

  // Insert the Task record
  insert newTask;

  System.debug('SUCCESS: Task created successfully!');
  System.debug('Task ID: ' + newTask.Id);

  // STEP 3: VERIFICATION QUERIES

  // Query the created Lead to verify standard fields
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
      LeadSource,
      Industry,
      Rating,
      Street,
      City,
      State,
      PostalCode,
      Country,
      Title,
      Website,
      Description,
      CreatedDate
    FROM Lead
    WHERE Id = :newLead.Id
  ];

  System.debug('LEAD VERIFICATION: Lead created successfully');
  System.debug('Lead ID: ' + createdLead.Id + ' | Name: ' + createdLead.FirstName + ' ' + createdLead.LastName);
  System.debug('Company: ' + createdLead.Company + ' | Email: ' + createdLead.Email);
  System.debug('Status: ' + createdLead.Status + ' | Lead Source: ' + createdLead.LeadSource);
  System.debug('Industry: ' + createdLead.Industry + ' | Rating: ' + createdLead.Rating);

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
  System.debug('Task ID: ' + createdTask.Id + ' | Related to Lead: ' + createdTask.Who.Name);
  System.debug('Type: ' + createdTask.Type + ' | Subject: ' + createdTask.Subject + ' | Status: ' + createdTask.Status);

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
