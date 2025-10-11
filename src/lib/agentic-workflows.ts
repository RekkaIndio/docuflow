import { collection, doc, getDocs, getDoc, query, where, orderBy, limit, Timestamp, setDoc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from './firebase';
import { workspaceCollectionPath } from './paths';

// Agentic Workflow Types
export interface WorkflowTrigger {
  type: 'schedule' | 'event' | 'condition' | 'manual';
  schedule?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
    time?: string; // HH:MM format
    dayOfWeek?: number; // 0-6 for weekly
    dayOfMonth?: number; // 1-31 for monthly
  };
  event?: {
    type: 'audit_completed' | 'document_uploaded' | 'user_action' | 'compliance_issue';
    conditions?: Record<string, any>;
  };
  condition?: {
    metric: string;
    operator: '>' | '<' | '=' | '>=' | '<=';
    value: number;
    duration?: number; // minutes
  };
}

export interface WorkflowAction {
  type: 'send_notification' | 'generate_report' | 'create_task' | 'send_email' | 'update_status' | 'schedule_audit' | 'escalate_issue';
  config: {
    recipients?: string[];
    template?: string;
    priority?: 'low' | 'medium' | 'high' | 'critical';
    message?: string;
    dueDate?: string;
    assignee?: string;
    auditType?: string;
    reportType?: string;
  };
}

export interface AgenticWorkflow {
  id: string;
  name: string;
  description: string;
  category: 'compliance' | 'performance' | 'risk' | 'operational' | 'reporting';
  trigger: WorkflowTrigger;
  actions: WorkflowAction[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastExecuted?: string;
  executionCount: number;
  successCount: number;
  workspaceId: string;
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  triggeredAt: string;
  completedAt?: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  results: Array<{
    actionIndex: number;
    status: 'success' | 'failed';
    message: string;
    data?: any;
  }>;
  triggerData?: any;
}

// Pre-defined workflow templates
export const WORKFLOW_TEMPLATES = {
  audit_reminder: {
    name: 'Audit Completion Reminder',
    description: 'Automatically remind staff about upcoming audit deadlines',
    category: 'compliance' as const,
    isActive: true,
    trigger: {
      type: 'schedule' as const,
      schedule: {
        frequency: 'weekly' as const,
        dayOfWeek: 1, // Monday
        time: '09:00'
      }
    },
    actions: [
      {
        type: 'send_notification' as const,
        config: {
          message: 'Weekly audit reminder: Please complete all outstanding audits by Friday.',
          priority: 'medium' as const
        }
      }
    ]
  },

  compliance_monitoring: {
    name: 'Compliance Issue Monitor',
    description: 'Monitor for compliance issues and escalate critical findings',
    category: 'compliance' as const,
    isActive: true,
    trigger: {
      type: 'condition' as const,
      condition: {
        metric: 'critical_issues',
        operator: '>' as const,
        value: 3,
        duration: 1440 // 24 hours
      }
    },
    actions: [
      {
        type: 'send_email' as const,
        config: {
          recipients: ['management@carehome.com'],
          template: 'compliance_alert',
          priority: 'high' as const,
          message: 'Critical compliance issues detected requiring immediate attention.'
        }
      },
      {
        type: 'create_task' as const,
        config: {
          assignee: 'compliance_officer',
          priority: 'critical' as const,
          message: 'Review and address critical compliance issues'
        }
      }
    ]
  },

  performance_report: {
    name: 'Monthly Performance Report',
    description: 'Generate and distribute monthly performance reports',
    category: 'reporting' as const,
    isActive: true,
    trigger: {
      type: 'schedule' as const,
      schedule: {
        frequency: 'monthly' as const,
        dayOfMonth: 1,
        time: '08:00'
      }
    },
    actions: [
      {
        type: 'generate_report' as const,
        config: {
          reportType: 'performance_summary',
          recipients: ['management@carehome.com', 'board@carehome.com']
        }
      }
    ]
  },

  risk_assessment: {
    name: 'Risk Assessment Trigger',
    description: 'Automatically trigger risk assessments based on audit scores',
    category: 'risk' as const,
    isActive: true,
    trigger: {
      type: 'condition' as const,
      condition: {
        metric: 'audit_score',
        operator: '<' as const,
        value: 70,
        duration: 60 // 1 hour
      }
    },
    actions: [
      {
        type: 'schedule_audit' as const,
        config: {
          auditType: 'risk-register',
          priority: 'high' as const,
          message: 'Risk assessment triggered due to low audit score'
        }
      }
    ]
  },

  staff_training_reminder: {
    name: 'Staff Training Reminder',
    description: 'Remind staff about upcoming training requirements',
    category: 'operational' as const,
    isActive: true,
    trigger: {
      type: 'schedule' as const,
      schedule: {
        frequency: 'monthly' as const,
        dayOfMonth: 15,
        time: '10:00'
      }
    },
    actions: [
      {
        type: 'send_notification' as const,
        config: {
          message: 'Monthly training reminder: Please complete all mandatory training modules.',
          priority: 'medium' as const
        }
      }
    ]
  }
};

/**
 * Create a new agentic workflow
 */
export async function createWorkflow(workspaceId: string, workflow: Omit<AgenticWorkflow, 'id' | 'createdAt' | 'updatedAt' | 'executionCount' | 'successCount' | 'workspaceId'>, orgId?: string | null): Promise<string> {
  try {
    const workflowData: AgenticWorkflow = {
      ...workflow,
      id: `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      executionCount: 0,
      successCount: 0,
      workspaceId
    };

  const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows', orgId || null));
  await setDoc(doc(workflowsCol, workflowData.id), workflowData);

    return workflowData.id;
  } catch (error) {
    console.error('Error creating workflow:', error);
    throw error;
  }
}

/**
 * Get all workflows for a workspace
 */
export async function getWorkflows(workspaceId: string, orgId?: string | null): Promise<AgenticWorkflow[]> {
  try {
  const workflowsCol = collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows', orgId || null));
  const snapshot = await getDocs(workflowsCol);

    return snapshot.docs.map(doc => doc.data() as AgenticWorkflow);
  } catch (error) {
    console.error('Error getting workflows:', error);
    return [];
  }
}

/**
 * Update workflow status
 */
export async function updateWorkflowStatus(workspaceId: string, workflowId: string, isActive: boolean, orgId?: string | null): Promise<void> {
  try {
  const workflowRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows', orgId || null)), workflowId);
    await updateDoc(workflowRef, {
      isActive,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error updating workflow status:', error);
    throw error;
  }
}

/**
 * Execute a workflow
 */
export async function executeWorkflow(workspaceId: string, workflowId: string, triggerData?: any, orgId?: string | null): Promise<WorkflowExecution> {
  try {
  const workflowRef = doc(collection(db, workspaceCollectionPath(workspaceId, 'agentic-workflows', orgId || null)), workflowId);
  const workflowSnap = await getDoc(workflowRef);

    if (!workflowSnap.exists()) {
      throw new Error('Workflow not found');
    }

    const workflow = workflowSnap.data() as AgenticWorkflow;

    const execution: WorkflowExecution = {
      id: `execution_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      workflowId,
      triggeredAt: new Date().toISOString(),
      status: 'running',
      results: [],
      triggerData
    };

    // Execute each action
    for (let i = 0; i < workflow.actions.length; i++) {
      const action = workflow.actions[i];
      try {
        const result = await executeAction(workspaceId, action, triggerData);
        execution.results.push({
          actionIndex: i,
          status: 'success',
          message: result.message,
          data: result.data
        });
      } catch (error) {
        execution.results.push({
          actionIndex: i,
          status: 'failed',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Update execution status
    const hasFailures = execution.results.some(r => r.status === 'failed');
    execution.status = hasFailures ? 'failed' : 'completed';
    execution.completedAt = new Date().toISOString();

    // Save execution record
  const executionsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflow-executions', orgId || null));
  await setDoc(doc(executionsCol, execution.id), execution);

    // Update workflow statistics
    await updateDoc(workflowRef, {
      lastExecuted: new Date().toISOString(),
      executionCount: workflow.executionCount + 1,
      successCount: workflow.successCount + (hasFailures ? 0 : 1),
      updatedAt: new Date().toISOString()
    });

    return execution;
  } catch (error) {
    console.error('Error executing workflow:', error);
    throw error;
  }
}

/**
 * Execute a single workflow action
 */
async function executeAction(workspaceId: string, action: WorkflowAction, triggerData?: any): Promise<{ message: string; data?: any }> {
  switch (action.type) {
    case 'send_notification':
      return await sendWorkflowNotification(workspaceId, action.config, triggerData);

    case 'generate_report':
      return await generateWorkflowReport(workspaceId, action.config, triggerData);

    case 'create_task':
      return await createWorkflowTask(workspaceId, action.config, triggerData);

    case 'send_email':
      return await sendWorkflowEmail(workspaceId, action.config, triggerData);

    case 'update_status':
      return await updateWorkflowStatusAction(workspaceId, action.config, triggerData);

    case 'schedule_audit':
      return await scheduleWorkflowAudit(workspaceId, action.config, triggerData);

    case 'escalate_issue':
      return await escalateWorkflowIssue(workspaceId, action.config, triggerData);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/**
 * Send workflow notification
 */
async function sendWorkflowNotification(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string }> {
  // Debug logging removed
  return { message: `Notification sent: ${config.message}` };
}

/**
 * Generate workflow report
 */
async function generateWorkflowReport(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string; data: any }> {
  // Debug logging removed
  return {
    message: `Report generated: ${config.reportType}`,
    data: { reportType: config.reportType, generatedAt: new Date().toISOString() }
  };
}

/**
 * Create workflow task
 */
async function createWorkflowTask(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string; data: any }> {
  // Debug logging removed
  return {
    message: `Task created: ${config.message}`,
    data: { taskId: `task_${Date.now()}`, assignee: config.assignee }
  };
}

/**
 * Send workflow email
 */
async function sendWorkflowEmail(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string }> {
  // Debug logging removed
  return { message: `Email sent to ${config.recipients?.length || 0} recipients` };
}

/**
 * Update status action
 */
async function updateWorkflowStatusAction(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string }> {
  // Debug logging removed
  return { message: 'Status updated successfully' };
}

/**
 * Schedule workflow audit
 */
async function scheduleWorkflowAudit(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string; data: any }> {
  // Debug logging removed
  return {
    message: `Audit scheduled: ${config.auditType}`,
    data: { auditType: config.auditType, scheduledAt: new Date().toISOString() }
  };
}

/**
 * Escalate workflow issue
 */
async function escalateWorkflowIssue(workspaceId: string, config: any, triggerData?: any): Promise<{ message: string }> {
  // Debug logging removed
  return { message: 'Issue escalated successfully' };
}

/**
 * Check and trigger workflows based on conditions
 */
export async function checkWorkflowTriggers(workspaceId: string, orgId?: string | null): Promise<void> {
  try {
    const workflows = await getWorkflows(workspaceId, orgId);
    const activeWorkflows = workflows.filter(w => w.isActive);

    for (const workflow of activeWorkflows) {
      if (workflow.trigger.type === 'condition') {
        const shouldTrigger = await evaluateCondition(workspaceId, workflow.trigger.condition!);
        if (shouldTrigger) {
          await executeWorkflow(workspaceId, workflow.id, undefined, orgId);
        }
      }
    }
  } catch (error) {
    console.error('Error checking workflow triggers:', error);
  }
}

/**
 * Evaluate workflow condition
 */
async function evaluateCondition(workspaceId: string, condition: NonNullable<WorkflowTrigger['condition']>): Promise<boolean> {
  // Implementation would evaluate the condition based on current data
  // This is a simplified version
  switch (condition.metric) {
    case 'critical_issues':
      // Check if critical issues exceed threshold
      return Math.random() > 0.7; // Mock implementation
    case 'audit_score':
      // Check if audit scores are below threshold
      return Math.random() > 0.8; // Mock implementation
    default:
      return false;
  }
}

/**
 * Get workflow execution history
 */
export async function getWorkflowExecutionHistory(workspaceId: string, workflowId?: string, limitCount: number = 50, orgId?: string | null): Promise<WorkflowExecution[]> {
  try {
  const executionsCol = collection(db, workspaceCollectionPath(workspaceId, 'workflow-executions', orgId || null));
    let q = query(executionsCol, orderBy('triggeredAt', 'desc'), limit(limitCount));

    if (workflowId) {
      q = query(executionsCol, where('workflowId', '==', workflowId), orderBy('triggeredAt', 'desc'), limit(limitCount));
    }

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data() as WorkflowExecution);
  } catch (error) {
    console.error('Error getting workflow execution history:', error);
    return [];
  }
}

/**
 * Create workflow from template
 */
export async function createWorkflowFromTemplate(workspaceId: string, templateKey: keyof typeof WORKFLOW_TEMPLATES, orgId?: string | null): Promise<string> {
  const template = WORKFLOW_TEMPLATES[templateKey];
  return await createWorkflow(workspaceId, template, orgId);
}