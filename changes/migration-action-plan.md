# Reino Capital - Migration Action Plan

## Objective
Merge the **latest calendar design** (from salesBlank/Produção Reino) with the **new lead management logic** (from Sandbox Reino) to create the optimal solution.

## Current Environment Status

### 🟢 salesBlank (Scratch Org)
- ✅ **Latest calendar design**
- ❌ Old/disabled lead management logic
- Purpose: Calendar development and testing

### 🟢 Produção Reino  
- ✅ **Latest calendar design**
- ❌ Old lead conversion logic (converts leads)
- Purpose: Production environment

### 🟡 Sandbox Reino
- ❌ Old calendar design
- ✅ **New lead management logic** (preserves leads)
- Purpose: Logic development and testing

## Key Technical Differences

### Lead Management Logic

#### Old Logic (Production):
```
Lead + "Interessado" → Convert Lead → Create Account/Contact → Create Opportunity → Lead disappears
```

#### New Logic (Sandbox):
```
Lead + "Interessado" → Keep Lead → Create Opportunity (linked via Nome_do_Lead__c) → Create Event → Lead stays visible
```

### Critical Components

#### Must Preserve from Sandbox Reino:
1. **TaskTriggerHandler.cls** (REACTIVATED version)
2. **LeadEventController.cls** (with Nome_do_Lead__c logic)
3. **kanbanPerson component** (with lead tracking)
4. **Opportunity.Nome_do_Lead__c field** (essential for traceability)

#### Must Import from salesBlank:
1. **calendarioReino component** (latest design)
2. **appointmentEditor** (enhanced interface)
3. **eventParticipantDisplay** (modern UI)
4. **All calendar-related styling and static resources**

## Migration Steps

### Phase 1: Preparation (1-2 hours)
1. **Backup Sandbox Reino**
   - Export all Apex classes
   - Document current automation
   - Save KanbanPerson configuration
   - Test current lead workflow

2. **Prepare salesBlank Components**
   - Identify all calendar components to migrate
   - Package static resources
   - Document component dependencies

### Phase 2: Calendar Migration (2-3 hours)
1. **Deploy Calendar Components to Sandbox Reino**
   ```bash
   # Deploy main calendar component
   sfdx force:source:deploy -p "force-app/main/default/lwc/calendarioReino" -u sandReino
   
   # Deploy supporting components
   sfdx force:source:deploy -p "force-app/main/default/lwc/appointmentEditor" -u sandReino
   sfdx force:source:deploy -p "force-app/main/default/lwc/eventParticipantDisplay" -u sandReino
   sfdx force:source:deploy -p "force-app/main/default/lwc/happeningNowIndicator" -u sandReino
   sfdx force:source:deploy -p "force-app/main/default/lwc/participantDetailsModal" -u sandReino
   sfdx force:source:deploy -p "force-app/main/default/lwc/teamsLinkGenerator" -u sandReino
   
   # Deploy color system
   sfdx force:source:deploy -p "force-app/main/default/lwc/colorConstants" -u sandReino
   sfdx force:source:deploy -p "force-app/main/default/lwc/eventColorManager" -u sandReino
   
   # Deploy static resources
   sfdx force:source:deploy -p "force-app/main/default/staticresources" -u sandReino
   ```

2. **Update Calendar Controller**
   ```bash
   # Deploy calendar controller (if needed)
   sfdx force:source:deploy -p "force-app/main/default/classes/CalendarioReinoController.cls" -u sandReino
   ```

### Phase 3: Verification (1 hour)
1. **Verify Lead Logic Preservation**
   - Confirm TaskTriggerHandler is still REACTIVATED
   - Test lead classification workflow
   - Verify Nome_do_Lead__c field functionality

2. **Test Calendar Functionality**
   - Open calendar with new design
   - Test meeting creation and editing
   - Verify room booking functionality
   - Test Teams integration

3. **Validate KanbanPerson Integration**
   - Confirm opportunities display with lead names
   - Test opportunity management workflow
   - Verify lead traceability

### Phase 4: Final Testing (1-2 hours)
1. **End-to-End Workflow Test**
   - Register call on lead with "Interessado"
   - Verify lead remains in lead list
   - Confirm opportunity creation with Nome_do_Lead__c
   - Check automatic event creation
   - Test calendar display of new events
   - Validate KanbanPerson shows opportunity

2. **User Acceptance Testing**
   - Test with actual users
   - Verify all expected functionality
   - Confirm improved user experience

## Success Criteria Checklist

### ✅ Lead Management
- [ ] Lead stays in lead list after "Interessado" classification
- [ ] Opportunity created automatically
- [ ] Nome_do_Lead__c field populated correctly
- [ ] Event created automatically for lead
- [ ] KanbanPerson displays opportunity with lead context

### ✅ Calendar Functionality  
- [ ] Calendar displays with latest design
- [ ] Meeting creation works correctly
- [ ] Room booking functionality active
- [ ] Teams integration functional
- [ ] Participant management working
- [ ] Event color coding correct

### ✅ Integration
- [ ] Calendar shows lead-based events
- [ ] KanbanPerson integrates with calendar
- [ ] All automation triggers working
- [ ] No lead conversion occurring

## Risk Mitigation

### High-Risk Areas
1. **TaskTriggerHandler** - Ensure it remains active after migration
2. **Nome_do_Lead__c queries** - Verify all components use this field correctly
3. **Calendar-KanbanPerson integration** - Test display of lead-based opportunities

### Rollback Plan
1. Keep complete backup of current Sandbox Reino
2. Document all changes during migration
3. Test rollback procedure before starting
4. Have quick restore scripts ready

## Post-Migration Actions

### Immediate (Same Day)
- [ ] Monitor system for any errors
- [ ] Test critical workflows multiple times
- [ ] Verify all automation is working
- [ ] Check user feedback

### Short-term (1 week)
- [ ] Monitor lead conversion rates
- [ ] Track opportunity creation accuracy
- [ ] Gather user feedback on new calendar design
- [ ] Document any issues or improvements needed

### Long-term (1 month)
- [ ] Analyze workflow efficiency improvements
- [ ] Plan deployment to production environment
- [ ] Consider additional enhancements
- [ ] Update user training materials

## Contact Information
- **Technical Lead**: [Your Name]
- **Business Owner**: Reino Capital Team
- **Backup Support**: [Backup Contact]

---

**Document Version**: 1.0  
**Created**: June 16, 2025  
**Status**: Ready for Implementation
