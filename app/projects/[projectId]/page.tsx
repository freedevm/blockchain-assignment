'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClientSupabase } from '@/lib/supabase';
import { apiFetch } from '@/lib/api-config';
import { RoleGuard } from '@/components/role-guard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Award, Calendar, Clock, Users, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  start_date: string | null;
  end_date: string | null;
  estimated_hours: number | null;
  actual_hours: number;
  account: { id: string; name: string } | null;
}

interface Task {
  id: string;
  name: string;
  status: string;
  priority: string;
  due_date: string | null;
  assigned_to: string | null;
  tx_hash: string | null;
  user_profiles?: { name: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  todo: 'bg-slate-100 text-slate-700',
  planning: 'bg-slate-100 text-slate-700',
  in_progress: 'bg-blue-100 text-blue-700',
  review: 'bg-yellow-100 text-yellow-700',
  done: 'bg-green-100 text-green-700',
  complete: 'bg-green-100 text-green-700',
  on_hold: 'bg-orange-100 text-orange-700',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: 'bg-slate-100 text-slate-600',
  medium: 'bg-blue-100 text-blue-600',
  high: 'bg-orange-100 text-orange-600',
  urgent: 'bg-red-100 text-red-600',
};

export default function ProjectDetailPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardingTaskId, setRewardingTaskId] = useState<string | null>(null);
  const [rewardErrors, setRewardErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!projectId) return;
    const load = async () => {
      try {
        setLoading(true);
        const supabase = createClientSupabase();
        if (!supabase) throw new Error('No database connection');

        const { data: proj, error: projErr } = await supabase
          .from('projects')
          .select('*, account:accounts(id, name)')
          .eq('id', projectId)
          .single();

        if (projErr || !proj) throw new Error('Project not found');
        setProject(proj as Project);

        const { data: taskData } = await supabase
          .from('tasks')
          .select(
            'id, name, status, priority, due_date, assigned_to, tx_hash, user_profiles:assigned_to(name)',
          )
          .eq('project_id', projectId)
          .order('created_at', { ascending: false });

        setTasks((taskData as Task[]) || []);
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Failed to load project';
        setError(message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [projectId]);

  const handleRewardTask = async (taskId: string) => {
    try {
      setRewardingTaskId(taskId);
      setRewardErrors((current) => {
        const next = { ...current };
        delete next[taskId];
        return next;
      });

      const response = await apiFetch(`/api/tasks/${taskId}/reward`, {
        method: 'POST',
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to reward task');
      }

      setTasks((current) =>
        current.map((task) => (task.id === taskId ? { ...task, tx_hash: data.txHash } : task)),
      );
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to reward task';
      setRewardErrors((current) => ({ ...current, [taskId]: message }));
    } finally {
      setRewardingTaskId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="p-6 text-center">
        <p className="text-destructive">{error || 'Project not found'}</p>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/projects')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Projects
        </Button>
      </div>
    );
  }

  return (
    <RoleGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="outline" size="sm" onClick={() => router.push('/projects')}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Back
          </Button>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge className={STATUS_COLORS[project.status] || ''}>
                {project.status.replace('_', ' ')}
              </Badge>
              <Badge className={PRIORITY_COLORS[project.priority] || ''}>{project.priority}</Badge>
            </div>
            {project.account && (
              <p className="mt-1 text-muted-foreground">
                <span className="font-medium">{project.account.name}</span>
              </p>
            )}
          </div>
        </div>

        {/* Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5" /> Project Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {project.description && <p className="text-muted-foreground">{project.description}</p>}
            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Start</p>
                  <p>
                    {project.start_date ? format(new Date(project.start_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Deadline</p>
                  <p>
                    {project.end_date ? format(new Date(project.end_date), 'MMM d, yyyy') : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Estimated</p>
                  <p>{project.estimated_hours ? `${project.estimated_hours}h` : '—'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Logged</p>
                  <p>{project.actual_hours}h</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Tasks
            </CardTitle>
            <CardDescription>
              {tasks.length} task{tasks.length !== 1 ? 's' : ''}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tasks.length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">No tasks yet</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{task.name}</p>
                      {task.user_profiles?.name && (
                        <p className="text-xs text-muted-foreground">{task.user_profiles.name}</p>
                      )}
                      {rewardErrors[task.id] && (
                        <p className="mt-1 text-xs text-destructive">{rewardErrors[task.id]}</p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:ml-2 sm:justify-end">
                      {task.due_date && (
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(task.due_date), 'MMM d')}
                        </span>
                      )}
                      <Badge className={STATUS_COLORS[task.status] || ''} variant="outline">
                        {task.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={PRIORITY_COLORS[task.priority] || ''} variant="outline">
                        {task.priority}
                      </Badge>
                      {['done', 'complete'].includes(task.status) &&
                        (task.tx_hash ? (
                          <Badge className="bg-emerald-100 text-emerald-700" title={task.tx_hash}>
                            Rewarded {task.tx_hash.slice(0, 10)}...
                          </Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={rewardingTaskId === task.id}
                            onClick={() => handleRewardTask(task.id)}
                          >
                            <Award className="mr-1 h-4 w-4" />
                            {rewardingTaskId === task.id ? 'Rewarding...' : 'Reward WPT'}
                          </Button>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </RoleGuard>
  );
}
