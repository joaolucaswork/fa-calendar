# Comprehensive Comparison: Three Reino Capital Environments

## Executive Summary

This document provides a detailed comparison between three distinct Salesforce environments used by Reino Capital:

1. **salesBlank (Scratch Org)** - Latest calendar design with updated UI/UX
2. **Produção Reino** - Production environment with updated design + old lead conversion logic
3. **Sandbox Reino** - Development environment with old design + new lead management logic

The goal is to merge the **latest calendar design** (from salesBlank/Produção) with the **new lead management logic** (from Sandbox Reino) to create the optimal solution.

## Environment Comparison Matrix

| Aspect | salesBlank (Scratch) | Produção Reino | Sandbox Reino |
|--------|---------------------|----------------|---------------|
| **Project Name** | salesBlank | Produção Reino | Sandbox Reino |
| **Salesforce API Version** | 63.0 | 64.0 | 64.0 |
| **Calendar Design** | ✅ **Latest/Updated** | ✅ **Latest/Updated** | ❌ **Old Design** |
| **Lead Management Logic** | ❌ **Old Logic** | ❌ **Old Logic (Conversion)** | ✅ **New Logic (No Conversion)** |
| **Primary Purpose** | Calendar development | Production environment | Logic development |
| **Lead Conversion** | Converts leads to accounts | Converts leads to accounts | **Keeps leads, creates linked opportunities** |
| **Opportunity Tracking** | Standard Account-based | Standard Account-based | **Lead-based via Nome_do_Lead__c** |
| **Event Creation** | Manual only | Manual only | **Auto-creates events for "Interessado" leads** |
| **KanbanPerson Integration** | Limited | Standard opportunity management | **Enhanced with lead tracking** |

## Key Business Logic Differences

### Lead Classification Workflow

#### Current Production Logic (salesBlank + Produção Reino):
1. User registers call on Lead with `classificacaoLeadAtividade__c = "Interessado"`
2. **Lead is converted** to Account/Contact
3. **Opportunity is created** and linked to the new Account
4. **Lead disappears** from Lead list (loses traceability)
5. Opportunity managed through standard Salesforce processes

#### New Sandbox Reino Logic:
1. User registers call on Lead with `classificacaoLeadAtividade__c = "Interessado"`
2. **Lead remains unconverted** (stays in Lead list)
3. **Opportunity is created** and linked to central account "Reino Capital - Oportunidades de Leads"
4. **Lead traceability maintained** via `Nome_do_Lead__c` field on Opportunity
5. **Event is automatically created** for the Lead
6. **KanbanPerson component** manages opportunities with lead context

## Technical Implementation Analysis

### Core Automation Classes

#### TaskTriggerHandler.cls - Lead Event Management

**Current State in salesBlank/Produção:**
- System is **COMMENTED OUT** or uses old conversion logic
- Leads are converted using `Database.LeadConvert`
- Standard Salesforce lead conversion process

**Sandbox Reino Implementation:**
```apex
/**
 * REACTIVATED - LEAD EVENT MANAGEMENT SYSTEM
 * This is our new method of tracking leads that replaces the old method
 * System is now active and functional
 */
public class TaskTriggerHandler {
  public static void handleAfterUpdate(List<Task> newTasks, Map<Id, Task> oldTasksMap) {
    // REACTIVATED - Lead Event Management System
    List<Task> tasksToProcess = new List<Task>();

    for (Task task : newTasks) {
      Task oldTask = oldTasksMap.get(task.Id);

      // Check if classificacaoLeadAtividade__c changed to "Interessado"
      if (task.classificacaoLeadAtividade__c == 'Interessado' &&
          oldTask.classificacaoLeadAtividade__c != 'Interessado') {
        tasksToProcess.add(task);
      }
    }

    if (!tasksToProcess.isEmpty()) {
      processInteressadoTasks(tasksToProcess);
    }
  }
}
```

#### LeadEventController.cls - Opportunity Creation Logic

**Key Method: `createLeadEventAndOpportunityInternal`**

**Sandbox Reino Logic:**
```apex
// Create new Opportunity linked to central Account
leadOpportunity = new Opportunity(
  Name = 'Lead: ' + leadFullName + ' - ' + lead.Company,
  StageName = 'Primeiro Contato',
  CloseDate = Date.today().addDays(30),
  AccountId = centralAccount.Id,  // Links to "Reino Capital - Oportunidades de Leads"
  OwnerId = lead.OwnerId,
  Nome_do_Lead__c = leadFullName,  // KEY: Maintains lead traceability
  Description = 'Oportunidade criada automaticamente para Lead classificado como Interessado.',
  Type = 'Lead em Prospecção'
);
```

**Central Account Strategy:**
- All lead-based opportunities link to account: **"Reino Capital - Oportunidades de Leads"**
- Lead name stored in `Nome_do_Lead__c` field for traceability
- Opportunities can be queried by lead name: `WHERE Nome_do_Lead__c = :leadFullName`

### KanbanPerson Component Integration

**Enhanced Lead Tracking:**
```javascript
// In kanbanPerson.js - Line 540-543
AccountName: record.Nome_do_Lead__c || record.Account?.Name || "N/A",
AccountId: record.AccountId || record.Account?.Id || null,
hasLeadName: !!record.Nome_do_Lead__c,  // Flag to identify lead-based opportunities
```

**Opportunity Query with Lead Context:**
```apex
// In LeadEventController.cls
List<Opportunity> opportunities = [
  SELECT Id, Name, StageName, CloseDate, Amount, Type,
         Probabilidade_da_Oportunidade__c, AccountId, Account.Name,
         Nome_do_Lead__c, OwnerId, Owner.Name, Description
  FROM Opportunity
  WHERE Nome_do_Lead__c = :leadFullName AND AccountId = :centralAccount.Id
  ORDER BY CreatedDate DESC
];
```

## Calendar Design Differences

### Current Calendar Status

#### salesBlank + Produção Reino (Updated Design):
- Modern UI with enhanced styling
- Updated FullCalendar integration
- Improved room availability indicators
- Enhanced participant display
- Modern color schemes and branding

#### Sandbox Reino (Old Design):
- Older calendar interface
- Less refined UI components
- Basic room management
- Standard color schemes
- Missing latest UX improvements

### Key Calendar Components to Migrate

**From salesBlank to Sandbox Reino:**
1. **calendarioReino component** - Latest version with updated styling
2. **appointmentEditor** - Enhanced meeting creation interface
3. **eventParticipantDisplay** - Modern participant management
4. **happeningNowIndicator** - Real-time meeting status
5. **participantDetailsModal** - Improved participant details
6. **teamsLinkGenerator** - Enhanced Teams integration

## Migration Strategy

### Phase 1: Backup Current Sandbox Reino Logic
1. Export all Apex classes related to lead management
2. Document current automation rules and triggers
3. Backup KanbanPerson component configuration
4. Save current opportunity creation logic

### Phase 2: Import Updated Calendar Design
1. Deploy latest calendarioReino component from salesBlank
2. Update all calendar-related LWC components
3. Import enhanced CSS and styling
4. Update static resources (FullCalendar, etc.)

### Phase 3: Preserve Lead Management Logic
1. Ensure TaskTriggerHandler remains **REACTIVATED**
2. Maintain LeadEventController with lead-opportunity linking
3. Keep Nome_do_Lead__c field functionality
4. Preserve KanbanPerson lead tracking features

### Phase 4: Integration Testing
1. Test lead classification workflow
2. Verify opportunity creation without conversion
3. Validate calendar functionality with new design
4. Confirm KanbanPerson displays lead-based opportunities correctly

## 1. Project Configuration Changes

### 1.1 SFDX Project Configuration

**File:** `sfdx-project.json`

**salesBlank Version:**
```json
{
  "name": "salesBlank",
  "sourceApiVersion": "63.0"
}
```

**Sandbox Reino Version:**
```json
{
  "name": "Sandbox Reino", // or "Produção Reino"
  "sourceApiVersion": "64.0"
}
```

**Impact:** API version upgrade from 63.0 to 64.0 provides access to newer Salesforce features and improvements.

## 2. Lightning Web Components (LWC) Analysis

### 2.1 Core Calendar Component

**Component:** `calendarioReino`

**Reino-Specific Features:**
- **Meeting Room Management:** Specific rooms configured for Reino Capital
  - "Sala Principal" (Main Room)
  - "Sala do Gabriel" (Gabriel's Room)  
  - "Outra Localização" (Other Location)
- **Room Availability Indicators:** Real-time room conflict detection
- **Custom Event Styling:** Reino-specific color schemes and branding
- **Portuguese Localization:** Full Brazilian Portuguese interface

**Key Differences:**
```javascript
// Reino-specific meeting rooms configuration
@track meetingRooms = [
  {
    value: "salaPrincipal",
    label: "Sala Principal",
    selected: true,
    availabilityClass: "room-availability available",
    availabilityIcon: "utility:success",
    availabilityText: "Disponível"
  },
  {
    value: "salaGabriel", 
    label: "Sala do Gabriel",
    selected: true
  }
  // ... additional Reino-specific rooms
];
```

### 2.2 Reino-Specific Components

**Components Present in Reino Version:**

1. **`reinoAddToCalendar`**
   - Purpose: Add Salesforce events to external calendars
   - Reino Capital branding and customization
   - CSP-compliant implementation
   - Supports Google Calendar, Outlook, and other providers

2. **`welcomeScreen`** (Reino-enhanced)
   - Custom greeting messages for different times of day
   - Reino-specific lead classification counters
   - Client categorization (Reino clients vs prospects)
   - Custom activity tracking and metrics

3. **`reuniaoModal`** (Reino-specific)
   - Meeting scheduling modal with Reino branding
   - Integration with Reino's meeting room system
   - Custom opportunity and contact management

### 2.3 Standard Components (Present in Both)

**Shared Components:**
- `appointmentEditor` - Meeting/appointment creation and editing
- `eventParticipantDisplay` - Participant management with photos
- `happeningNowIndicator` - Real-time meeting status
- `participantDetailsModal` - Detailed participant information
- `teamsLinkGenerator` - Microsoft Teams integration
- `colorConstants` - Color system management
- `eventColorManager` - Event color customization

## 3. Apex Controller Modifications

### 3.1 CalendarioReinoController

**Reino-Specific Enhancements:**
- **Custom Field Support:** Enhanced event queries including Reino-specific fields
- **Room Availability Logic:** Advanced room conflict detection
- **Status Management:** Custom meeting status picklist values
- **Security Model:** Uses `without sharing` for collaborative calendar access

**Key Custom Fields:**
```apex
// Reino-specific Event fields
salaReuniao__c,          // Meeting room assignment
gestor__c,               // Manager participant name  
liderComercial__c,       // Commercial leader name
sdr__c,                  // SDR participant name
customColor__c,          // Custom hex color for events
statusReuniao__c,        // Meeting status values
reuniaoAconteceu__c      // Meeting outcome tracking
```

## 4. Data Model Extensions

### 4.1 Custom Objects and Fields

**Event Object Enhancements:**
- `salaReuniao__c` (Text, 255) - Meeting room identifier
- `gestorName__c` (Text, 255) - Manager participant name
- `liderComercialName__c` (Text, 255) - Commercial leader name  
- `sdrName__c` (Text, 255) - SDR participant name
- `statusReuniao__c` (Picklist) - Meeting status values
- `customColor__c` (Text, 7) - Custom hex color for events

**Account Object Enhancements:**
- `emProspeccao__c` (Checkbox) - Prospect classification
- `Patrimonio_Financeiro__c` - Financial portfolio information

### 4.2 Global Value Sets

**Reino-Specific Picklists:**
- `EspecificacaoAtivo` - Asset specification values
- `Gestores` - Manager selection values
- `ImpostoRenda` - Income tax options
- `Indexador` - Index type options
- `Modalidade` - Investment modality options
- `Tipo_de_Ativos` - Asset type classifications

## 5. User Interface Customizations

### 5.1 Styling and Branding

**Reino-Specific CSS Variables:**
```css
:host {
  --reino-border-color: #d5d5d5;
  --reino-divisor-color: #000;
  --reino-date-text-color: #504f4f;
  --reino-cta-background: #926f1b;
  --reino-cta-text: white;
  /* ... additional Reino branding colors */
}
```

### 5.2 Event Color Coding

**Reino Event Types:**
- `.reino-event-opportunity` - Light mint green (#d6f3e4) with green border
- `.reino-event-contact` - Light lavender (#e3e7fb) with blue border
- Custom color system for different meeting types and participants

## 6. Integration Enhancements

### 6.1 Microsoft Teams Integration

**Enhanced Features:**
- Custom Teams link generation for Reino meetings
- Integration with Reino's meeting room booking system
- Automatic Teams meeting creation for online meetings

### 6.2 Calendar Integration

**External Calendar Support:**
- Google Calendar integration with Reino branding
- Outlook calendar support
- Custom timezone handling (America/Sao_Paulo)
- Event export functionality

## 7. Business Logic Differences

### 7.1 Lead Management

**Reino-Specific Classifications:**
- Lead interest levels (Interessado, Sem Interesse, Não Atendeu)
- Financial profile categorization (Mais de Milhão, Sem Perfil)
- Day-based lead tracking (Day 11 leads)
- Custom lead conversion workflows

### 7.2 Client Categorization

**Reino Client Types:**
- `clientesReinoCount` - Established Reino clients
- `clientesEmProspeccaoCount` - Prospects in pipeline
- Custom client list views and filters

## 8. Security and Permissions

### 8.1 Sharing Model Changes

**CalendarioReinoController:**
- Uses `without sharing` for collaborative calendar access
- Allows all users to see calendar events for better team coordination
- Enhanced visibility for corporate calendar system

## 9. Dependencies and Technical Stack

### 9.1 Package Dependencies

**Updated Dependencies in Reino Version:**
```json
{
  "@lwc/engine-dom": "^8.20.0",        // Updated from 8.18.0
  "@salesforce/eslint-plugin-lightning": "^1.0.1", // Updated from 1.0.0
  "eslint": "^8.57.1",                  // Updated from 8.57.0
  "eslint-plugin-jest": "^28.13.5",    // Updated from 28.11.0
  "lint-staged": "^15.5.2"             // Updated from 15.5.1
}
```

### 9.2 Static Resources

**Maintained Resources:**
- FullCalendar v3.10.2 - Calendar rendering engine
- Floating UI DOM v1.5.3 - Modal positioning system

## 10. Deployment and Configuration

### 10.1 Custom Tabs

**Reino-Specific Tab:**
```xml
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <label>Calendário</label>
    <lwcComponent>calendarioReino</lwcComponent>
    <motif>Custom51: Apple</motif>
</CustomTab>
```

### 10.2 List Views

**Reino-Specific Views:**
- `clientesReino.listView` - Custom client list for Reino Capital
- Filtered views for prospect management
- Custom column configurations for Reino business needs

## 11. Functional Differences Summary

| Feature | salesBlank | Sandbox Reino |
|---------|------------|---------------|
| **Meeting Rooms** | Generic room support | Reino-specific rooms (Sala Principal, Sala do Gabriel) |
| **Event Colors** | Standard color system | Reino-branded color scheme |
| **Lead Classification** | Basic lead management | Advanced Reino-specific classifications |
| **Client Management** | Standard account management | Reino client vs prospect categorization |
| **Calendar Integration** | Basic external calendar support | Enhanced integration with Reino branding |
| **Language** | English/Generic | Brazilian Portuguese with Reino terminology |
| **Branding** | Generic styling | Reino Capital corporate branding |
| **User Experience** | Standard Salesforce UX | Customized for Reino business processes |

## 12. Migration Considerations

### 12.1 Data Migration Requirements

**Custom Fields:** All Reino-specific custom fields must be created in target org
**Picklist Values:** Reino-specific global value sets must be deployed
**User Permissions:** Enhanced sharing model requires permission updates

### 12.2 Component Dependencies

**Required Components for Reino Version:**
1. All standard components from salesBlank
2. Reino-specific components (reinoAddToCalendar, welcomeScreen enhancements)
3. Custom Apex controllers with Reino business logic
4. Reino-specific static resources and styling

## 13. Recommendations

### 13.1 Version Control Strategy

1. **Maintain Separate Branches:** Keep salesBlank as baseline, Reino as customization branch
2. **Feature Flags:** Consider implementing feature flags for Reino-specific functionality
3. **Modular Architecture:** Separate Reino customizations into distinct modules

### 13.2 Future Development

1. **API Version Alignment:** Consider upgrading salesBlank to API version 64.0
2. **Component Reusability:** Extract common functionality into shared components
3. **Configuration-Driven Customization:** Move Reino-specific configurations to custom metadata

## 14. Detailed Code Analysis

### 14.1 Component-by-Component Comparison

#### calendarioReino Component

**File Structure:**
- `calendarioReino.js` - Main component logic (3,500+ lines)
- `calendarioReino.html` - Template with Reino-specific UI elements
- `calendarioReino.css` - Custom styling with Reino branding (3,500+ lines)
- `calendarioReino.js-meta.xml` - Component metadata

**Key Reino Customizations:**

<augment_code_snippet path="force-app/main/default/lwc/calendarioReino/calendarioReino.js" mode="EXCERPT">
````javascript
// Reino-specific meeting rooms configuration
@track meetingRooms = [
  {
    value: "salaPrincipal",
    label: "Sala Principal",
    selected: true,
    availabilityClass: "room-availability available",
    availabilityIcon: "utility:success",
    availabilityText: "Disponível",
    showOccupiedSlots: false,
    occupiedSlots: []
  }
];
````
</augment_code_snippet>

**Room Availability Logic:**
- Real-time conflict detection for Reino meeting rooms
- Visual indicators for room availability status
- Occupied time slot display for better scheduling

#### reinoAddToCalendar Component

**Purpose:** Reino-branded external calendar integration

<augment_code_snippet path="force-app/main/default/lwc/reinoAddToCalendar/reinoAddToCalendar.js" mode="EXCERPT">
````javascript
/**
 * Componente de adicionar ao calendário para o Reino Capital
 * Uma implementação nativa LWC compatível com CSP sem dependências externas
 * @last-modified 2023-05-14
 */
export default class ReinoAddToCalendar extends LightningElement {
    @api recordId;
    timeZone = 'America/Sao_Paulo'; // Default timezone for Reino
````
</augment_code_snippet>

### 14.2 Apex Controller Enhancements

#### CalendarioReinoController

**Enhanced Event Query:**

<augment_code_snippet path="force-app/main/default/classes/CalendarioReinoController.cls" mode="EXCERPT">
````apex
/**
 * Controller for the calendarioReino LWC component
 * Note: Using 'without sharing' to allow all users to see all calendar events
 * for better collaboration and visibility in corporate calendar system
 */
public without sharing class CalendarioReinoController {
  @AuraEnabled
  public static List<Map<String, Object>> getEvents(Date startDate, Date endDate) {
    // Enhanced query with Reino-specific fields
    List<Event> events = [
      SELECT Id, Subject, Description, StartDateTime, EndDateTime,
             salaReuniao__c, gestor__c, liderComercial__c, sdr__c,
             customColor__c, statusReuniao__c, reuniaoAconteceu__c
      FROM Event
      WHERE StartDateTime <= :endDate AND EndDateTime >= :startDate
    ];
  }
}
````
</augment_code_snippet>

### 14.3 Custom Object Configurations

#### Account Object - Reino Extensions

**Custom List View:**

<augment_code_snippet path="force-app/main/default/objects/Account/listViews/clientesReino.listView-meta.xml" mode="EXCERPT">
````xml
<?xml version="1.0" encoding="UTF-8"?>
<ListView xmlns="http://soap.sforce.com/2006/04/metadata">
    <fullName>clientesReino</fullName>
    <columns>ACCOUNT.NAME</columns>
    <columns>Patrimonio_Financeiro__c</columns>
    <filters>
        <field>emProspeccao__c</field>
        <operation>equals</operation>
        <value>0</value>
    </filters>
    <label>Clientes Reino</label>
</ListView>
````
</augment_code_snippet>

## 15. Styling and UX Differences

### 15.1 Reino Brand Colors

**CSS Custom Properties:**

<augment_code_snippet path="force-app/main/default/lwc/welcomeScreen/welcomeScreen.css" mode="EXCERPT">
````css
:host {
  /* Reino-specific color palette */
  --reino-border-color: #d5d5d5;
  --reino-divisor-color: #000;
  --reino-date-text-color: #504f4f;
  --reino-cta-background: #926f1b;
  --reino-cta-text: white;
  --reino-shadow-color: rgba(133, 133, 133, 0.1);
}
````
</augment_code_snippet>

### 15.2 Event Type Styling

**Reino Event Classifications:**

<augment_code_snippet path="force-app/main/default/lwc/calendarioReino/calendarioReino.css" mode="EXCERPT">
````css
/* Reino-specific event styling */
:host .reino-event-opportunity {
  background-color: #d6f3e4; /* Light mint (pastel green) */
  border: 2px solid #4bca81; /* Green border */
}

:host .reino-event-contact {
  background-color: #e3e7fb; /* Light lavender (pastel blue) */
  border: 2px solid #4f6bed; /* Blue border */
}
````
</augment_code_snippet>

## 16. Business Process Differences

### 16.1 Lead Classification System

**Reino-Specific Lead Categories:**
- **Interessado** - Interested leads requiring follow-up
- **Sem Interesse** - Leads marked as not interested
- **Não Atendeu** - Leads that didn't answer calls
- **Inválido** - Invalid or incorrect lead information
- **Sem Perfil** - Leads that don't match Reino's target profile
- **Mais de Milhão** - High-value leads (>R$1M portfolio)
- **Frios** - Cold leads requiring nurturing
- **Day 11** - Leads requiring 11-day follow-up cycle
- **Retornar Depois** - Leads to contact later

### 16.2 Client Management Workflow

**Reino Client Categorization:**
1. **Clientes Reino** (`emProspeccao__c = false`) - Established clients
2. **Clientes em Prospecção** (`emProspeccao__c = true`) - Active prospects
3. **Patrimônio Financeiro** - Financial portfolio tracking
4. **Custom opportunity stages** - Reino-specific sales pipeline

## 17. Integration Architecture

### 17.1 Microsoft Teams Integration

**Enhanced Teams Features:**
- Automatic Teams meeting creation for Reino meetings
- Custom meeting room integration with Teams
- Reino-branded meeting invitations
- Timezone handling for Brazilian business hours

### 17.2 External Calendar Integration

**Supported Platforms:**
- Google Calendar with Reino branding
- Microsoft Outlook integration
- Apple Calendar support
- Custom ICS file generation

## 18. Performance and Scalability Considerations

### 18.1 Database Query Optimizations

**Reino-Specific Optimizations:**
- Enhanced indexing on custom fields (`salaReuniao__c`, `statusReuniao__c`)
- Optimized room availability queries
- Efficient participant lookup mechanisms

### 18.2 Component Loading Strategy

**Lazy Loading Implementation:**
- Conditional loading of Reino-specific components
- Progressive enhancement for advanced features
- Optimized bundle sizes for better performance

## 19. Testing and Quality Assurance

### 19.1 Test Coverage Analysis

**Reino-Specific Test Classes:**
- `CalendarioReinoControllerTest` - Enhanced test coverage for Reino features
- Room availability testing scenarios
- Custom field validation tests
- Integration testing for external calendar features

### 19.2 User Acceptance Testing Scenarios

**Reino-Specific Test Cases:**
1. Meeting room booking and conflict resolution
2. Lead classification workflow validation
3. Client categorization accuracy
4. External calendar integration functionality
5. Portuguese localization verification

## 20. Deployment Strategy

### 20.1 Phased Deployment Approach

**Phase 1: Core Infrastructure**
- Deploy custom fields and objects
- Install Reino-specific global value sets
- Configure security and sharing rules

**Phase 2: Component Deployment**
- Deploy shared components (appointmentEditor, eventParticipantDisplay)
- Install Reino-specific components (reinoAddToCalendar, calendarioReino)
- Configure custom tabs and navigation

**Phase 3: Data Migration**
- Migrate existing event data to new custom fields
- Update lead classifications to Reino standards
- Configure user permissions and profiles

**Phase 4: User Training and Rollout**
- Train users on Reino-specific features
- Provide documentation for new workflows
- Monitor system performance and user adoption

### 20.2 Rollback Strategy

**Contingency Planning:**
- Maintain salesBlank baseline for emergency rollback
- Data backup procedures for custom field values
- Component versioning for selective rollback
- User communication plan for system changes

## Specific Migration Recommendations

### Critical Files to Preserve from Sandbox Reino

**Apex Classes (Lead Management Logic):**
1. `TaskTriggerHandler.cls` - **KEEP REACTIVATED VERSION**
2. `LeadEventController.cls` - **KEEP with Nome_do_Lead__c logic**
3. Any custom classes supporting KanbanPerson lead integration

**Custom Fields:**
1. `Opportunity.Nome_do_Lead__c` - **ESSENTIAL for lead traceability**
2. `Task.classificacaoLeadAtividade__c` - **Trigger field for automation**
3. All lead classification fields

**LWC Components to Preserve:**
1. `kanbanPerson` - **Enhanced version with lead tracking**
2. Any custom components supporting lead-opportunity workflow

### Critical Files to Import from salesBlank

**Calendar Components (Latest Design):**
1. `calendarioReino` - **Complete component with latest styling**
2. `appointmentEditor` - **Enhanced meeting creation**
3. `eventParticipantDisplay` - **Modern participant management**
4. `happeningNowIndicator` - **Real-time status**
5. `participantDetailsModal` - **Improved details view**
6. `teamsLinkGenerator` - **Enhanced Teams integration**

**Supporting Components:**
1. `colorConstants` - **Updated color system**
2. `eventColorManager` - **Enhanced color management**

**Static Resources:**
1. Updated FullCalendar library
2. Enhanced CSS styling files
3. Modern UI assets

### Deployment Checklist

#### Pre-Migration Validation
- [ ] Backup current Sandbox Reino automation logic
- [ ] Document all custom fields and their usage
- [ ] Export current KanbanPerson configuration
- [ ] Test current lead-to-opportunity workflow

#### Migration Steps
1. **Deploy Calendar Components**
   - [ ] Import calendarioReino from salesBlank
   - [ ] Deploy all supporting calendar LWC components
   - [ ] Update static resources

2. **Preserve Business Logic**
   - [ ] Verify TaskTriggerHandler remains active
   - [ ] Confirm LeadEventController functionality
   - [ ] Test Nome_do_Lead__c field integration

3. **Integration Testing**
   - [ ] Test lead classification workflow
   - [ ] Verify opportunity creation without conversion
   - [ ] Validate calendar display and functionality
   - [ ] Confirm KanbanPerson shows lead-based opportunities

4. **User Acceptance Testing**
   - [ ] Test complete lead-to-opportunity workflow
   - [ ] Verify calendar meeting creation and management
   - [ ] Validate room booking functionality
   - [ ] Test Teams integration

#### Post-Migration Validation
- [ ] Confirm leads remain in lead list after "Interessado" classification
- [ ] Verify opportunities are created with Nome_do_Lead__c populated
- [ ] Test calendar functionality with new design
- [ ] Validate KanbanPerson displays opportunities correctly
- [ ] Confirm automatic event creation for interested leads

### Risk Mitigation

**High-Risk Areas:**
1. **Lead Conversion Logic** - Ensure old conversion logic is completely disabled
2. **Opportunity Queries** - Verify all queries include Nome_do_Lead__c field
3. **Calendar Integration** - Test calendar with lead-based opportunities
4. **KanbanPerson Display** - Confirm lead names display correctly

**Rollback Plan:**
1. Keep complete backup of current Sandbox Reino
2. Document all changes made during migration
3. Prepare quick rollback scripts for critical components
4. Test rollback procedure in development environment

### Success Criteria

**Functional Requirements:**
1. ✅ Lead remains in lead list after "Interessado" classification
2. ✅ Opportunity created automatically with lead traceability
3. ✅ Event created automatically for interested leads
4. ✅ Calendar displays with latest design and functionality
5. ✅ KanbanPerson shows opportunities with lead context
6. ✅ Room booking and Teams integration work correctly

**Technical Requirements:**
1. ✅ TaskTriggerHandler active and processing correctly
2. ✅ LeadEventController creating opportunities with Nome_do_Lead__c
3. ✅ Calendar components using latest design from salesBlank
4. ✅ All automation triggers functioning as expected
5. ✅ No lead conversion occurring for "Interessado" classification

---

**Document Version:** 2.0
**Last Updated:** June 16, 2025
**Prepared By:** Augment Agent
**Review Status:** Updated with Three-Environment Analysis
**Focus:** Merge Latest Calendar Design with New Lead Management Logic

## Appendices

### Appendix A: Complete Component Inventory

**salesBlank Components:**
- appointmentEditor
- eventParticipantDisplay
- happeningNowIndicator
- participantDetailsModal
- teamsLinkGenerator
- colorConstants
- eventColorManager

**Reino-Specific Components:**
- calendarioReino (enhanced)
- reinoAddToCalendar
- welcomeScreen (Reino-enhanced)
- reuniaoModal

**Additional Reino Components (Referenced but not in current directory):**
- sidebarChamada
- chamadaFormManager
- chamadaTabManager
- convertedLeadsList
- kanbanPerson
- recentChangesModal

### Appendix B: Custom Field Mapping

| Object | Field API Name | Type | Purpose | Reino-Specific |
|--------|---------------|------|---------|----------------|
| Event | salaReuniao__c | Text(255) | Meeting room assignment | Yes |
| Event | gestor__c | Text(255) | Manager participant | Yes |
| Event | liderComercial__c | Text(255) | Commercial leader | Yes |
| Event | sdr__c | Text(255) | SDR participant | Yes |
| Event | customColor__c | Text(7) | Custom event color | Yes |
| Event | statusReuniao__c | Picklist | Meeting status | Yes |
| Event | reuniaoAconteceu__c | Checkbox | Meeting outcome | Yes |
| Account | emProspeccao__c | Checkbox | Prospect flag | Yes |
| Account | Patrimonio_Financeiro__c | Currency | Portfolio value | Yes |

### Appendix C: API Version Compatibility Matrix

| Feature | API 63.0 (salesBlank) | API 64.0 (Reino) | Impact |
|---------|----------------------|-------------------|---------|
| LWC Framework | Supported | Enhanced | Better performance |
| Custom Metadata | Supported | Enhanced | More configuration options |
| Flow Builder | Supported | Enhanced | Advanced automation |
| Einstein Features | Limited | Enhanced | Better AI integration |
| Mobile Support | Standard | Improved | Better mobile experience |
