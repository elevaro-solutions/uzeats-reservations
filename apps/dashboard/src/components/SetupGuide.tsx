'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Button, Card, Progress, Tag, Tooltip, Typography } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleOutlined,
  CloseOutlined,
  DownOutlined,
  ShrinkOutlined,
  UpOutlined,
} from '@ant-design/icons';
import { colors, radii } from '@reservations/ui';
import {
  isSectionDone,
  isTaskDone,
  isTaskSkipped,
  type SetupGuide as SetupGuideModel,
  type SetupGuideLocalState,
  type SetupTask,
  getSetupProgress,
} from '@/lib/onboarding';
import type { useSetupGuideState } from '@/lib/useSetupGuide';

const { Text } = Typography;

type GuideLocal = ReturnType<typeof useSetupGuideState>;

export function TaskStatusIcon({
  task,
  local,
  size = 16,
}: {
  task: SetupTask;
  local?: SetupGuideLocalState;
  size?: number;
}) {
  if (isTaskDone(task, local)) {
    return (
      <CheckCircleFilled
        aria-label="Done"
        style={{ fontSize: size, color: isTaskSkipped(task, local) ? colors.neutral[400] : colors.brand[600] }}
      />
    );
  }
  if (task.waiting) {
    return <ClockCircleOutlined aria-label="Waiting" style={{ fontSize: size, color: colors.warning }} />;
  }
  return (
    <span
      aria-label="To do"
      className="rt-setup-guide__dot"
      style={{ width: size - 4, height: size - 4, margin: 2 }}
    />
  );
}

/** Review-only steps have no data signal, so say up front how they get checked off. */
function ReviewHint({ task, local }: { task: SetupTask; local: SetupGuideLocalState }) {
  if (!task.completeOnVisit || task.blockedReason || isTaskDone(task, local)) return null;
  return (
    <Text type="secondary" style={{ display: 'block', fontSize: 12, fontStyle: 'italic' }}>
      Checked off once you open it.
    </Text>
  );
}

export function TaskActions({
  task,
  local,
  size = 'small',
}: {
  task: SetupTask;
  local: GuideLocal;
  size?: 'small' | 'middle';
}) {
  const done = isTaskDone(task, local.state);
  const skipped = isTaskSkipped(task, local.state);

  if (task.blockedReason) {
    return (
      <div className="rt-setup-guide__actions">
        <Text type="secondary" style={{ fontSize: 12 }}>
          {task.blockedReason}
        </Text>
        {!task.required && !skipped && !done && (
          <Button size={size} type="text" onClick={() => local.skip(task.key)}>
            Skip
          </Button>
        )}
        {skipped && (
          <Button size={size} type="text" onClick={() => local.unskip(task.key)}>
            Undo skip
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="rt-setup-guide__actions">
      {task.waiting && !task.complete ? (
        <Tag icon={<ClockCircleOutlined />} color="gold" style={{ margin: 0 }}>
          In review
        </Tag>
      ) : (
        <Link
          href={task.href}
          onClick={() => {
            if (task.completeOnVisit) local.markVisited(task.key);
          }}
        >
          <Button size={size} type={done ? 'default' : 'primary'}>
            {done ? 'Open' : (task.cta ?? 'Start')}
          </Button>
        </Link>
      )}
      {!task.required && !task.complete && !skipped && !done && (
        <Button size={size} type="text" onClick={() => local.skip(task.key)}>
          Skip
        </Button>
      )}
      {skipped && (
        <Button size={size} type="text" onClick={() => local.unskip(task.key)}>
          Undo skip
        </Button>
      )}
    </div>
  );
}

/** Full-page version of the guide: every section as a card with inline actions. */
export function SetupChecklist({
  guide,
  local,
  renderTaskExtra,
}: {
  guide: SetupGuideModel;
  local: GuideLocal;
  renderTaskExtra?: (task: SetupTask) => React.ReactNode;
}) {
  return (
    <div className="rt-setup-checklist">
      {guide.sections.map((section, index) => {
        const done = isSectionDone(section, local.state);
        const finished = section.tasks.filter((t) => isTaskDone(t, local.state)).length;
        return (
          <Card
            key={section.key}
            className="rt-surface-card"
            style={{ borderRadius: radii.lg }}
            styles={{ body: { padding: 0 } }}
          >
            <div className="rt-setup-checklist__head">
              <span className={`rt-setup-checklist__step${done ? ' is-done' : ''}`}>
                {done ? <CheckCircleFilled /> : index + 1}
              </span>
              <Text strong style={{ fontSize: 15 }}>
                {section.title}
              </Text>
              <Text type="secondary" style={{ marginLeft: 'auto', fontSize: 13 }}>
                {finished} of {section.tasks.length}
              </Text>
            </div>
            <ul className="rt-setup-checklist__tasks">
              {section.tasks.map((task) => {
                const extra = renderTaskExtra?.(task);
                return (
                  <li key={task.key}>
                    <TaskStatusIcon task={task} local={local.state} size={18} />
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div className="rt-setup-checklist__title">
                        <Text
                          strong
                          className={isTaskSkipped(task, local.state) ? 'rt-setup-guide__struck' : undefined}
                        >
                          {task.title}
                        </Text>
                        {!task.required && <Tag style={{ margin: 0 }}>Optional</Tag>}
                      </div>
                      <Text type="secondary" style={{ display: 'block', marginTop: 2 }}>
                        {task.description}
                      </Text>
                      <ReviewHint task={task} local={local.state} />
                      {extra && <div style={{ marginTop: 12 }}>{extra}</div>}
                    </div>
                    <TaskActions task={task} local={local} size="middle" />
                  </li>
                );
              })}
            </ul>
          </Card>
        );
      })}
    </div>
  );
}

function firstOpenSectionKey(guide: SetupGuideModel, local: SetupGuideLocalState) {
  return guide.sections.find((s) => !isSectionDone(s, local))?.key ?? null;
}

function firstOpenTaskKey(tasks: SetupTask[], local: SetupGuideLocalState) {
  return tasks.find((t) => !isTaskDone(t, local))?.key ?? null;
}

/** Floating Stripe-style setup checklist pinned to the bottom-right of Partner Hub. */
export function SetupGuidePanel({
  guide,
  local,
  subtitle,
}: {
  guide: SetupGuideModel;
  local: GuideLocal;
  subtitle?: string;
}) {
  const progress = useMemo(() => getSetupProgress(guide, local.state), [guide, local.state]);
  const [openSection, setOpenSection] = useState<string | null>(() =>
    firstOpenSectionKey(guide, local.state),
  );
  const [openTask, setOpenTask] = useState<string | null>(null);

  // Re-anchor on the next unfinished section when the venue switches.
  useEffect(() => {
    setOpenSection(firstOpenSectionKey(guide, local.state));
    setOpenTask(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guide.scope]);

  if (local.state.hidden) return null;

  if (local.state.minimized) {
    return (
      <button
        type="button"
        className="rt-setup-guide-launcher"
        onClick={() => local.setMinimized(false)}
        aria-label={`Open ${guide.title.toLowerCase()}`}
      >
        <Progress
          type="circle"
          percent={progress.percent}
          size={22}
          strokeWidth={14}
          showInfo={false}
          strokeColor={colors.brand[600]}
        />
        <span className="rt-setup-guide-launcher__label">{guide.title}</span>
        <span className="rt-setup-guide-launcher__count">
          {progress.completed}/{progress.total}
        </span>
      </button>
    );
  }

  return (
    <section className="rt-setup-guide" aria-label={guide.title}>
      <header className="rt-setup-guide__header">
        <div style={{ minWidth: 0 }}>
          <Text strong style={{ display: 'block' }}>
            {guide.title}
          </Text>
          {subtitle && (
            <Text type="secondary" ellipsis style={{ display: 'block', fontSize: 12 }}>
              {subtitle}
            </Text>
          )}
        </div>
        <div className="rt-setup-guide__header-actions">
          <Link href={guide.checklistHref} className="rt-setup-guide__link">
            View all
          </Link>
          <Tooltip title="Minimize">
            <Button
              type="text"
              size="small"
              aria-label="Minimize setup guide"
              icon={<ShrinkOutlined />}
              onClick={() => local.setMinimized(true)}
            />
          </Tooltip>
          <Tooltip title="Hide — reopen from the full checklist">
            <Button
              type="text"
              size="small"
              aria-label="Hide setup guide"
              icon={<CloseOutlined />}
              onClick={() => local.setHidden(true)}
            />
          </Tooltip>
        </div>
      </header>
      <Progress
        percent={progress.percent}
        showInfo={false}
        size="small"
        strokeColor={colors.brand[600]}
        className="rt-setup-guide__progress"
      />

      {progress.allComplete ? (
        <div className="rt-setup-guide__done">
          <CheckCircleFilled style={{ fontSize: 28, color: colors.brand[600] }} />
          <Text strong>You are all set</Text>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Every step is complete. You can reopen the full checklist from your account menu.
          </Text>
          <Button type="primary" size="small" onClick={() => local.setHidden(true)}>
            Dismiss guide
          </Button>
        </div>
      ) : (
        <div className="rt-setup-guide__body">
          {guide.sections.map((section) => {
            const expanded = openSection === section.key;
            const sectionDone = isSectionDone(section, local.state);
            const activeTask = openTask ?? firstOpenTaskKey(section.tasks, local.state);
            return (
              <div
                key={section.key}
                className={`rt-setup-guide__section${expanded ? ' is-open' : ''}`}
              >
                <button
                  type="button"
                  className="rt-setup-guide__section-head"
                  aria-expanded={expanded}
                  onClick={() => {
                    setOpenSection(expanded ? null : section.key);
                    setOpenTask(null);
                  }}
                >
                  <span className={sectionDone ? 'rt-setup-guide__struck' : undefined}>
                    {section.title}
                  </span>
                  {expanded ? <UpOutlined /> : <DownOutlined />}
                </button>
                {expanded && (
                  <ul className="rt-setup-guide__tasks">
                    {section.tasks.map((task) => {
                      const taskOpen = activeTask === task.key;
                      return (
                        <li key={task.key} className={taskOpen ? 'is-open' : undefined}>
                          <button
                            type="button"
                            className="rt-setup-guide__task"
                            aria-expanded={taskOpen}
                            onClick={() => setOpenTask(taskOpen ? '' : task.key)}
                          >
                            <TaskStatusIcon task={task} local={local.state} />
                            <span
                              className={
                                isTaskSkipped(task, local.state) ? 'rt-setup-guide__struck' : undefined
                              }
                            >
                              {task.title}
                            </span>
                            {!task.required && !isTaskDone(task, local.state) && (
                              <span className="rt-setup-guide__optional">Optional</span>
                            )}
                          </button>
                          {taskOpen && (
                            <div className="rt-setup-guide__task-detail">
                              <Text type="secondary" style={{ fontSize: 13 }}>
                                {task.description}
                              </Text>
                              <ReviewHint task={task} local={local.state} />
                              <TaskActions task={task} local={local} />
                            </div>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
