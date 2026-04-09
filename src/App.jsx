import { useEffect, useMemo, useState } from "react";
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Group,
  Modal,
  NumberInput,
  PasswordInput,
  Paper,
  Progress,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Textarea,
  TextInput,
  ThemeIcon,
  Title
} from "@mantine/core";
import {
  IconBolt,
  IconCheck,
  IconConfetti,
  IconLockCog,
  IconMask,
  IconPlayerSkipForward,
  IconPlus,
  IconTrash,
  IconX
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import { defaultTasks } from "./data/defaultTasks";
import heroImage from "./img/Screenshot 2026-03-23 at 21.24.59.png";
import jonathanMaxterImage from "./img/jonathan-maxter.png";
import jonnySadImage from "./img/jonny-sad.png";
import jonnySunglassesImage from "./img/jonny-sunglasses.png";

const STORAGE_KEY = "stag-do-forfeit-frenzy";
const ADMIN_PASSWORD_HASH_KEY = "stag-do-admin-password-hash";
const TASK_DECK_VERSION = "2026-04-09-baxter-deck";
const DEFAULT_ADMIN_PASSWORD_HASH =
  "db147973b597a971bae280e6ab2e1b82cc04353cb11d8ca43bdb5721316ba68c";
const DEFAULT_PASSES = 5;

function getDefaultTasks() {
  return defaultTasks.map((task) => ({ ...task }));
}

function createInitialState() {
  return {
    taskDeckVersion: TASK_DECK_VERSION,
    tasks: getDefaultTasks(),
    passesLeft: DEFAULT_PASSES,
    currentTask: null,
    completedTaskIds: [],
    passedTaskIds: [],
    history: [],
    maxterMilestoneAcknowledged: 0,
    summaryAcknowledgedAtResolvedCount: 0
  };
}

const cardMotion = {
  initial: { opacity: 0, y: 24, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1 },
  transition: { duration: 0.45, ease: "easeOut" }
};

const outcomeModalMotion = {
  initial: { opacity: 0, y: 220, scale: 0.78, rotate: -4 },
  animate: { opacity: 1, y: 0, scale: 1, rotate: 0 },
  exit: { opacity: 0, y: 180, scale: 0.84, rotate: 3 },
  transition: {
    duration: 0.68,
    ease: [0.16, 1, 0.3, 1]
  }
};

function generateTaskId() {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ensureAdminPasswordHash() {
  if (typeof window === "undefined") {
    return DEFAULT_ADMIN_PASSWORD_HASH;
  }

  const existingHash = window.localStorage.getItem(ADMIN_PASSWORD_HASH_KEY);

  if (existingHash) {
    return existingHash;
  }

  window.localStorage.setItem(ADMIN_PASSWORD_HASH_KEY, DEFAULT_ADMIN_PASSWORD_HASH);
  return DEFAULT_ADMIN_PASSWORD_HASH;
}

async function hashValue(value) {
  const buffer = await window.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(buffer))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function loadState() {
  if (typeof window === "undefined") {
    return createInitialState();
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return createInitialState();
    }

    const parsed = JSON.parse(stored);
    const nextState = {
      ...createInitialState(),
      ...parsed
    };

    if (parsed.taskDeckVersion !== TASK_DECK_VERSION) {
      return createInitialState();
    }

    return {
      ...nextState,
      taskDeckVersion: TASK_DECK_VERSION,
      tasks:
        Array.isArray(parsed.tasks) && parsed.tasks.length > 0
          ? parsed.tasks
          : getDefaultTasks()
    };
  } catch (error) {
    console.error("Failed to load saved stag app state.", error);
    return createInitialState();
  }
}

function App() {
  const [state, setState] = useState(loadState);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminLoginOpen, setAdminLoginOpen] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [adminPasswordError, setAdminPasswordError] = useState("");
  const [authenticatingAdmin, setAuthenticatingAdmin] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [celebrationOpen, setCelebrationOpen] = useState(false);
  const [passResult, setPassResult] = useState(null);
  const [taskRevealOpen, setTaskRevealOpen] = useState(false);
  const [maxterOpen, setMaxterOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [draftTitle, setDraftTitle] = useState("");
  const [draftDescription, setDraftDescription] = useState("");

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    ensureAdminPasswordHash();
  }, []);

  const availableTasks = useMemo(() => {
    const unavailable = new Set([
      ...state.completedTaskIds,
      ...state.passedTaskIds,
      state.currentTask?.id
    ]);

    return state.tasks.filter((task) => !unavailable.has(task.id));
  }, [state]);

  const completionRate = state.tasks.length
    ? Math.round(
        ((state.completedTaskIds.length + state.passedTaskIds.length) /
          state.tasks.length) *
          100
      )
    : 0;
  const resolvedTaskCount = state.completedTaskIds.length + state.passedTaskIds.length;
  const maxterMilestoneCount = Math.floor(resolvedTaskCount / 5);
  const allTasksResolved =
    state.tasks.length > 0 &&
    resolvedTaskCount === state.tasks.length &&
    !state.currentTask;

  function updateState(updater) {
    setState((current) => updater(current));
  }

  function openConfirmation(action) {
    setConfirmState(action);
  }

  function closeConfirmation() {
    setConfirmState(null);
  }

  function revealTask() {
    let revealed = false;

    updateState((current) => {
      if (current.currentTask) {
        return current;
      }

      const unavailable = new Set([
        ...current.completedTaskIds,
        ...current.passedTaskIds,
        current.currentTask?.id
      ]);
      const nextPool = current.tasks.filter((task) => !unavailable.has(task.id));

      if (nextPool.length === 0) {
        return current;
      }

      const nextTask = nextPool[Math.floor(Math.random() * nextPool.length)];
      revealed = true;

      return {
        ...current,
        currentTask: nextTask,
        history: [{ id: nextTask.id, status: "revealed" }, ...current.history]
      };
    });

    if (revealed) {
      setTaskRevealOpen(true);
    }
  }

  function passTask() {
    let nextPassesLeft = null;

    updateState((current) => {
      if (!current.currentTask || current.passesLeft <= 0) {
        return current;
      }

      nextPassesLeft = current.passesLeft - 1;

      return {
        ...current,
        passesLeft: nextPassesLeft,
        passedTaskIds: [...current.passedTaskIds, current.currentTask.id],
        history: [
          { id: current.currentTask.id, status: "passed" },
          ...current.history.filter((entry) => entry.id !== current.currentTask.id)
        ],
        currentTask: null
      };
    });

    if (nextPassesLeft !== null) {
      setTaskRevealOpen(false);
      setPassResult({ passesLeft: nextPassesLeft });
    }
  }

  function completeTask() {
    let completed = false;

    updateState((current) => {
      if (!current.currentTask) {
        return current;
      }

      completed = true;

      return {
        ...current,
        completedTaskIds: [...current.completedTaskIds, current.currentTask.id],
        history: [
          { id: current.currentTask.id, status: "completed" },
          ...current.history.filter((entry) => entry.id !== current.currentTask.id)
        ],
        currentTask: null
      };
    });

    if (completed) {
      setTaskRevealOpen(false);
      setCelebrationOpen(true);
    }
  }

  function addTask() {
    const title = draftTitle.trim();
    const description = draftDescription.trim();

    if (!title || !description) {
      return;
    }

    const newTask = {
      id: generateTaskId(),
      title,
      description
    };

    updateState((current) => ({
      ...current,
      tasks: [newTask, ...current.tasks]
    }));

    setDraftTitle("");
    setDraftDescription("");
  }

  function removeTask(taskId) {
    updateState((current) => ({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== taskId),
      completedTaskIds: current.completedTaskIds.filter((id) => id !== taskId),
      passedTaskIds: current.passedTaskIds.filter((id) => id !== taskId),
      history: current.history.filter((entry) => entry.id !== taskId),
      currentTask:
        current.currentTask?.id === taskId ? null : current.currentTask
    }));
  }

  function updatePasses(nextValue) {
    const parsedValue =
      typeof nextValue === "number" ? nextValue : Number.parseInt(nextValue, 10);

    updateState((current) => ({
      ...current,
      passesLeft: Number.isFinite(parsedValue) ? parsedValue : current.passesLeft
    }));
  }

  function resetEverything() {
    setState(createInitialState());
    setAdminOpen(false);
    setAdminLoginOpen(false);
    setConfirmState(null);
    setCelebrationOpen(false);
    setPassResult(null);
    setTaskRevealOpen(false);
    setMaxterOpen(false);
    setSummaryOpen(false);
  }

  function resetProgress() {
    updateState((current) => ({
      ...current,
      passesLeft: 0,
      currentTask: null,
      completedTaskIds: [],
      passedTaskIds: [],
      history: [],
      maxterMilestoneAcknowledged: 0,
      summaryAcknowledgedAtResolvedCount: 0
    }));
    setCelebrationOpen(false);
    setPassResult(null);
    setTaskRevealOpen(false);
    setMaxterOpen(false);
    setSummaryOpen(false);
  }

  function updateTask(taskId, field, value) {
    updateState((current) => {
      const tasks = current.tasks.map((task) =>
        task.id === taskId ? { ...task, [field]: value } : task
      );
      const updatedCurrentTask =
        current.currentTask?.id === taskId
          ? tasks.find((task) => task.id === taskId) || null
          : current.currentTask;

      return {
        ...current,
        tasks,
        currentTask: updatedCurrentTask
      };
    });
  }

  function setTaskAsActive(taskId) {
    updateState((current) => {
      const nextTask = current.tasks.find((task) => task.id === taskId);

      if (!nextTask) {
        return current;
      }

      return {
        ...current,
        currentTask: nextTask,
        completedTaskIds: current.completedTaskIds.filter((id) => id !== taskId),
        passedTaskIds: current.passedTaskIds.filter((id) => id !== taskId),
        history: [
          { id: taskId, status: "revealed" },
          ...current.history.filter((entry) => entry.id !== taskId)
        ]
      };
    });
  }

  function openAdminAccess() {
    setAdminPasswordError("");
    setAdminPassword("");
    ensureAdminPasswordHash();
    setAdminLoginOpen(true);
  }

  function closeAdminLogin() {
    setAdminLoginOpen(false);
    setAdminPassword("");
    setAdminPasswordError("");
  }

  async function unlockAdmin(event) {
    event.preventDefault();

    if (!adminPassword) {
      setAdminPasswordError("Enter the admin password.");
      return;
    }

    setAuthenticatingAdmin(true);
    setAdminPasswordError("");

    try {
      const storedHash = ensureAdminPasswordHash();
      const attemptedHash = await hashValue(adminPassword);

      if (attemptedHash !== storedHash) {
        setAdminPasswordError("Incorrect password.");
        return;
      }

      setAdminOpen(true);
      closeAdminLogin();
    } catch (error) {
      console.error("Failed to validate admin password.", error);
      setAdminPasswordError("Password check failed on this browser.");
    } finally {
      setAuthenticatingAdmin(false);
    }
  }

  const historyLookup = state.history
    .map((entry) => ({
      ...entry,
      task: state.tasks.find((task) => task.id === entry.id)
    }))
    .filter((entry) => entry.task);

  useEffect(() => {
    if (
      maxterMilestoneCount > 0 &&
      maxterMilestoneCount > state.maxterMilestoneAcknowledged
    ) {
      setMaxterOpen(true);
    }
  }, [maxterMilestoneCount, state.maxterMilestoneAcknowledged]);

  useEffect(() => {
    if (
      allTasksResolved &&
      resolvedTaskCount > state.summaryAcknowledgedAtResolvedCount
    ) {
      setSummaryOpen(true);
    }
  }, [
    allTasksResolved,
    resolvedTaskCount,
    state.summaryAcknowledgedAtResolvedCount
  ]);

  function closeMaxterModal() {
    setMaxterOpen(false);
    updateState((current) => ({
      ...current,
      maxterMilestoneAcknowledged: Math.max(
        current.maxterMilestoneAcknowledged,
        Math.floor(
          (current.completedTaskIds.length + current.passedTaskIds.length) / 5
        )
      )
    }));
  }

  function closeSummary() {
    setSummaryOpen(false);
    updateState((current) => ({
      ...current,
      summaryAcknowledgedAtResolvedCount: Math.max(
        current.summaryAcknowledgedAtResolvedCount,
        current.completedTaskIds.length + current.passedTaskIds.length
      )
    }));
  }

  return (
    <Box className="app-shell">
      <div className="background-orb orb-one" />
      <div className="background-orb orb-two" />
      <div className="background-grid" />

      <Stack className="app-content" gap="xl">
        <motion.div {...cardMotion}>
          <Paper className="hero-panel" shadow="xl" radius="32px" p="xl">
            <div className="hero-layout">
              <Stack gap="sm" className="hero-copy-block">
                <Group justify="space-between" align="flex-start" wrap="wrap">
                  <Button
                    leftSection={<IconLockCog size={18} />}
                    size="md"
                    variant="default"
                    color="dark"
                    onClick={openAdminAccess}
                    className="admin-button"
                  >
                    Admin Panel
                  </Button>
                </Group>

                <Title order={1} className="hero-title">
                  Shtaaag
                </Title>
                <Text className="hero-copy">
                  <em>
                    <strong>Baxter Bitch Brigade! </strong>
                  </em>
                  Scroll down - randomly pull a task, and let the carnage ensue.
                </Text>
              </Stack>

              <motion.div
                className="hero-image-shell"
                initial={{ opacity: 0, x: 24, scale: 0.96 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.12, ease: "easeOut" }}
              >
                <img src={heroImage} alt="Stag party hero" className="hero-image" />
              </motion.div>
            </div>

            <Paper
              className="feature-card current-task-card current-task-panel"
              shadow="xl"
              radius="30px"
              p="xl"
              mt="xl"
            >
              <Group justify="space-between" align="center">
                <Title order={2}>Current Forfeit</Title>
                <ThemeIcon size={52} radius="xl" className="icon-tile">
                  <IconBolt size={26} />
                </ThemeIcon>
              </Group>

              <AnimatePresence mode="wait">
                {state.currentTask ? (
                  <motion.div
                    key={state.currentTask.id}
                    initial={{ opacity: 0, rotate: -1.5, scale: 0.95 }}
                    animate={{ opacity: 1, rotate: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.4 }}
                  >
                    <Paper className="task-panel" radius="26px" p="xl" mt="lg">
                      <Badge color="brand" variant="filled" radius="xl" size="lg">
                        Live Challenge
                      </Badge>
                      <Title order={3} mt="md">
                        {state.currentTask.title}
                      </Title>
                      <Text mt="sm" className="task-description">
                        {state.currentTask.description}
                      </Text>

                      <Group mt="xl" className="task-action-group">
                        <Button
                          size="lg"
                          color="teal"
                          leftSection={<IconCheck size={20} />}
                          onClick={completeTask}
                          className="action-button success"
                        >
                          Task Crushed
                        </Button>
                        <Button
                          size="lg"
                          color="red"
                          variant="default"
                          leftSection={<IconPlayerSkipForward size={20} />}
                          onClick={() =>
                            openConfirmation({
                              title: "Use a pass?",
                              message:
                                "This will skip the current task and permanently spend one of the stag's passes.",
                              confirmLabel: "Yes, burn a pass",
                              confirmColor: "red",
                              onConfirm: passTask
                            })
                          }
                          disabled={state.passesLeft <= 0}
                          className="action-button"
                        >
                          Pass
                        </Button>
                      </Group>
                    </Paper>
                  </motion.div>
                ) : (
                  <motion.div
                    key="empty-task"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -18 }}
                    transition={{ duration: 0.35 }}
                  >
                    <Paper className="task-panel empty-state" radius="26px" p="xl" mt="lg">
                      <Text className="eyebrow">Awaiting questionable decisions</Text>
                      <Title order={3} mt="sm">
                        No active task on deck.
                      </Title>
                      <Text mt="sm" className="task-description">
                        Reveal a fresh forfeit when the stag is ready for public
                        humiliation.
                      </Text>
                    </Paper>
                  </motion.div>
                )}
              </AnimatePresence>

              <Group mt="xl" className="task-action-group">
                <Button
                  size="xl"
                  color="brand"
                  leftSection={<IconBolt size={24} />}
                  onClick={() =>
                    openConfirmation({
                      title: "Reveal next task?",
                      message:
                        "This will randomly pull the next available forfeit from the deck.",
                      confirmLabel: "Reveal task",
                      confirmColor: "brand",
                      onConfirm: revealTask
                    })
                  }
                  disabled={Boolean(state.currentTask) || availableTasks.length === 0}
                  className="action-button reveal"
                >
                  Reveal Task
                </Button>
              </Group>
            </Paper>

            <SimpleGrid cols={{ base: 1, sm: 3 }} spacing="md" mt="xl">
              <StatCard
                icon={IconMask}
                label="Tasks Left"
                value={availableTasks.length + (state.currentTask ? 1 : 0)}
                tone="pink"
              />
              <StatCard
                icon={IconPlayerSkipForward}
                label="Passes Left"
                value={state.passesLeft}
                tone="orange"
              />
              <StatCard
                icon={IconConfetti}
                label="Progress"
                value={`${completionRate}%`}
                tone="lime"
              />
            </SimpleGrid>

            <Progress
              value={completionRate}
              size="xl"
              radius="xl"
              color="brand"
              striped
              animated
              mt="xl"
            />
          </Paper>
        </motion.div>

        <motion.div {...cardMotion} transition={{ delay: 0.16, duration: 0.45 }}>
          <Card className="feature-card history-card" shadow="xl" radius="30px" p="xl">
            <Group justify="space-between" align="center">
              <Title order={2}>Night Log</Title>
              <Badge variant="light" color="dark" size="lg" radius="xl">
                {historyLookup.length} events
              </Badge>
            </Group>

            <ScrollArea h={470} mt="lg" offsetScrollbars>
              <Stack gap="md">
                <AnimatePresence>
                  {historyLookup.length > 0 ? (
                    historyLookup.map((entry, index) => (
                      <motion.div
                        key={`${entry.id}-${entry.status}-${index}`}
                        initial={{ opacity: 0, x: 18 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -18 }}
                        transition={{ duration: 0.25, delay: index * 0.04 }}
                      >
                        <Paper className={`history-item ${entry.status}`} radius="22px" p="md">
                          <Group justify="space-between" align="flex-start">
                            <Stack gap={4}>
                              <Text fw={700}>{entry.task.title}</Text>
                              <Text size="sm" c="dimmed">
                                {entry.task.description}
                              </Text>
                            </Stack>
                            <Badge
                              color={
                                entry.status === "completed"
                                  ? "teal"
                                  : entry.status === "passed"
                                    ? "red"
                                    : "brand"
                              }
                              variant="filled"
                              radius="xl"
                            >
                              {entry.status}
                            </Badge>
                          </Group>
                        </Paper>
                      </motion.div>
                    ))
                  ) : (
                    <Paper className="history-item empty" radius="22px" p="lg">
                      <Text fw={700}>No chaos logged yet.</Text>
                      <Text size="sm" c="dimmed" mt={6}>
                        Once tasks are revealed, passed, or completed, the timeline
                        will fill itself in.
                      </Text>
                    </Paper>
                  )}
                </AnimatePresence>
              </Stack>
            </ScrollArea>
          </Card>
        </motion.div>
      </Stack>

      <Modal
        opened={Boolean(confirmState)}
        onClose={closeConfirmation}
        centered
        zIndex={500}
        radius="28px"
        padding="xl"
        withCloseButton={false}
        overlayProps={{ blur: 6, opacity: 0.62 }}
        classNames={{ content: "confirm-modal" }}
      >
        {confirmState && (
          <Box className="modal-body-shell">
            <ActionIcon
              variant="light"
              radius="xl"
              size="lg"
              className="modal-corner-close"
              onClick={closeConfirmation}
              aria-label="Close modal"
            >
              <IconX size={18} />
            </ActionIcon>
            <Stack gap="lg">
              <Title order={3}>{confirmState.title}</Title>
              <Text>{confirmState.message}</Text>
              <Group grow>
                <Button
                  variant="default"
                  size="md"
                  onClick={closeConfirmation}
                  className="confirm-button"
                >
                  Cancel
                </Button>
                <Button
                  size="md"
                  color={confirmState.confirmColor}
                  className="confirm-button"
                  onClick={() => {
                    confirmState.onConfirm();
                    closeConfirmation();
                  }}
                >
                  {confirmState.confirmLabel}
                </Button>
              </Group>
            </Stack>
          </Box>
        )}
      </Modal>

      <Modal
        opened={taskRevealOpen && Boolean(state.currentTask)}
        onClose={() => setTaskRevealOpen(false)}
        centered
        zIndex={440}
        withCloseButton={false}
        radius="30px"
        padding={0}
        size="calc(100vw - 24px)"
        overlayProps={{ blur: 6, opacity: 0.68 }}
        classNames={{ content: "task-reveal-modal" }}
      >
        {state.currentTask && (
          <motion.div {...outcomeModalMotion} className="outcome-shell task-reveal-shell">
            <ActionIcon
              variant="light"
              radius="xl"
              size="lg"
              className="modal-corner-close"
              onClick={() => setTaskRevealOpen(false)}
              aria-label="Close modal"
            >
              <IconX size={18} />
            </ActionIcon>
            <Stack gap="lg" p="xl" className="outcome-content task-reveal-content">
              <Badge size="lg" radius="xl" variant="light" className="outcome-badge">
                Fresh Forfeit
              </Badge>
              <Title order={1} className="task-reveal-title">
                {state.currentTask.title}
              </Title>
              <Text className="task-reveal-copy">
                {state.currentTask.description}
              </Text>
              <Button
                size="xl"
                color="brand"
                className="action-button outcome-button"
                onClick={() => setTaskRevealOpen(false)}
              >
                Done
              </Button>
            </Stack>
          </motion.div>
        )}
      </Modal>

      <Modal
        opened={celebrationOpen}
        onClose={() => setCelebrationOpen(false)}
        centered
        zIndex={450}
        withCloseButton={false}
        radius="30px"
        padding={0}
        overlayProps={{ blur: 6, opacity: 0.64 }}
        classNames={{ content: "outcome-modal celebration-modal" }}
      >
        <motion.div {...outcomeModalMotion} className="outcome-shell celebration-shell">
          <ActionIcon
            variant="light"
            radius="xl"
            size="lg"
            className="modal-corner-close"
            onClick={() => setCelebrationOpen(false)}
            aria-label="Close modal"
          >
            <IconX size={18} />
          </ActionIcon>
          <div className="confetti-burst" aria-hidden="true">
            {Array.from({ length: 22 }).map((_, index) => (
              <span
                key={`confetti-${index}`}
                className={`confetti-piece confetti-piece-${(index % 6) + 1}`}
                style={{
                  left: `${(index * 7) % 100}%`,
                  animationDelay: `${index * 0.08}s`
                }}
              />
            ))}
          </div>
          <Stack gap="lg" p="xl" className="outcome-content">
            <div className="outcome-photo-frame">
              <img
                src={jonnySunglassesImage}
                alt="Jonny wearing sunglasses"
                className="outcome-photo"
              />
            </div>
            <Badge size="lg" radius="xl" variant="light" className="outcome-badge">
              Maximum Celebration
            </Badge>
            <Title order={2} className="outcome-title">
              What a good boy, quick someone ring Chloe
            </Title>
            <Button
              size="lg"
              color="brand"
              className="action-button outcome-button"
              onClick={() => setCelebrationOpen(false)}
            >
              Done
            </Button>
          </Stack>
        </motion.div>
      </Modal>

      <Modal
        opened={maxterOpen}
        onClose={closeMaxterModal}
        centered
        zIndex={455}
        withCloseButton={false}
        radius="30px"
        padding={0}
        overlayProps={{ blur: 7, opacity: 0.72 }}
        classNames={{ content: "outcome-modal maxter-modal" }}
      >
        <motion.div {...outcomeModalMotion} className="outcome-shell maxter-shell">
          <div className="maxter-sparkles" aria-hidden="true">
            {Array.from({ length: 18 }).map((_, index) => (
              <span
                key={`maxter-sparkle-${index}`}
                className={`maxter-sparkle sparkle-${(index % 6) + 1}`}
                style={{
                  left: `${(index * 11) % 100}%`,
                  top: `${10 + ((index * 7) % 78)}%`,
                  animationDelay: `${index * 0.15}s`
                }}
              />
            ))}
          </div>

          <Stack gap="lg" p="xl" className="outcome-content maxter-content">
            <div className="outcome-photo-frame maxter-photo-frame">
              <img
                src={jonathanMaxterImage}
                alt="Jonathan MAXTER"
                className="outcome-photo maxter-photo"
              />
            </div>
            <Title order={1} className="maxter-title">
              Jonathan MAXTER
            </Title>
            <Text className="maxter-copy">
              OOOOWEEEE Time to down your drink you big tall drink of piss
            </Text>
            <Button
              size="lg"
              color="pink"
              className="action-button outcome-button maxter-button"
              onClick={closeMaxterModal}
            >
              Slay
            </Button>
          </Stack>
        </motion.div>
      </Modal>

      <Modal
        opened={Boolean(passResult)}
        onClose={() => setPassResult(null)}
        centered
        zIndex={450}
        withCloseButton={false}
        radius="30px"
        padding={0}
        overlayProps={{ blur: 6, opacity: 0.64 }}
        classNames={{ content: "outcome-modal pass-modal" }}
      >
        {passResult && (
          <motion.div {...outcomeModalMotion} className="outcome-shell pass-shell">
            <ActionIcon
              variant="light"
              radius="xl"
              size="lg"
              className="modal-corner-close"
              onClick={() => setPassResult(null)}
              aria-label="Close modal"
            >
              <IconX size={18} />
            </ActionIcon>
            <Stack gap="lg" p="xl" className="outcome-content">
              <div className="outcome-photo-frame">
                <img
                  src={jonnySadImage}
                  alt="Jonny looking sad"
                  className="outcome-photo"
                />
              </div>
              <Badge size="lg" radius="xl" variant="light" className="outcome-badge">
                Pass Burned
              </Badge>
              <Title order={2} className="outcome-title">
                Lil bitch:  {passResult.passesLeft} passes remaining
              </Title>
              <Text className="outcome-copy">
                One skip has gone. The shame stays on the record.
              </Text>
              <Button
                size="lg"
                color="brand"
                className="action-button outcome-button"
                onClick={() => setPassResult(null)}
              >
                Done
              </Button>
            </Stack>
          </motion.div>
        )}
      </Modal>

      <Modal
        opened={summaryOpen}
        onClose={closeSummary}
        centered
        zIndex={450}
        withCloseButton={false}
        radius="30px"
        padding={0}
        overlayProps={{ blur: 6, opacity: 0.64 }}
        classNames={{ content: "outcome-modal summary-modal" }}
      >
        <motion.div {...outcomeModalMotion} className="outcome-shell summary-shell">
          <ActionIcon
            variant="light"
            radius="xl"
            size="lg"
            className="modal-corner-close"
            onClick={closeSummary}
            aria-label="Close modal"
          >
            <IconX size={18} />
          </ActionIcon>
          <Stack gap="lg" p="xl" className="outcome-content">
            <Badge size="lg" radius="xl" variant="light" className="outcome-badge">
              Night Summary
            </Badge>
            <Title order={2} className="outcome-title">
              Every task has been dealt with
            </Title>
            <Text className="outcome-copy">
              The deck is empty. Nothing remains except the evidence.
            </Text>
            <SimpleGrid cols={2} spacing="md" w="100%" maw={420}>
              <Paper className="summary-stat" radius="24px" p="md">
                <Text fw={700}>Completed</Text>
                <Title order={2}>{state.completedTaskIds.length}</Title>
              </Paper>
              <Paper className="summary-stat" radius="24px" p="md">
                <Text fw={700}>Passed</Text>
                <Title order={2}>{state.passedTaskIds.length}</Title>
              </Paper>
            </SimpleGrid>
            <Button
              size="lg"
              color="brand"
              className="action-button outcome-button"
              onClick={closeSummary}
            >
              Done
            </Button>
          </Stack>
        </motion.div>
      </Modal>

      <Modal
        opened={adminOpen}
        onClose={() => setAdminOpen(false)}
        centered
        zIndex={400}
        size="xl"
        radius="32px"
        padding="xl"
        overlayProps={{ blur: 6, opacity: 0.58 }}
        title={<Title order={3}>Admin Panel</Title>}
        classNames={{
          content: "admin-modal",
          header: "admin-modal-header",
          body: "admin-modal-body"
        }}
      >
        <Stack gap="lg">
          <Paper className="admin-section" radius="24px" p="lg">
            <Group justify="space-between" align="center">
              <Stack gap={2}>
                <Text fw={700}>Manage passes</Text>
                <Text size="sm" c="dimmed">
                  Adjust how many skips the stag has left tonight.
                </Text>
              </Stack>
              <NumberInput
                value={state.passesLeft}
                onChange={updatePasses}
                min={0}
                max={20}
                w={140}
                allowDecimal={false}
                clampBehavior="strict"
              />
            </Group>
          </Paper>

          <Paper className="admin-section" radius="24px" p="lg">
            <Stack gap="md">
              <Text fw={700}>Add a new task</Text>
              <TextInput
                label="Task title"
                placeholder="Example: Karaoke hostage situation"
                value={draftTitle}
                onChange={(event) => setDraftTitle(event.currentTarget.value)}
              />
              <Textarea
                label="Task description"
                placeholder="Describe the public humiliation in full..."
                value={draftDescription}
                onChange={(event) => setDraftDescription(event.currentTarget.value)}
                minRows={3}
                autosize
              />
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={addTask}
                color="brand"
                className="action-button"
              >
                Add Task
              </Button>
            </Stack>
          </Paper>

          <Paper className="admin-section" radius="24px" p="lg">
            <Group justify="space-between" align="center" mb="md">
              <Stack gap={2}>
                <Text fw={700}>Task deck</Text>
                <Text size="sm" c="dimmed">
                  Edit any task inline, or remove it from the active pool.
                </Text>
              </Stack>
              <Badge color="brand" variant="light" size="lg" radius="xl">
                {state.tasks.length} total
              </Badge>
            </Group>

            <ScrollArea h={420} offsetScrollbars>
              <Stack gap="sm">
                {state.tasks.map((task, index) => (
                  <Paper key={task.id} className="task-list-item" radius="20px" p="md">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center" wrap="wrap">
                        <Group gap="xs" className="admin-task-badges">
                          <Badge variant="light" color="brand" radius="xl">
                            Task {index + 1}
                          </Badge>
                          {state.currentTask?.id === task.id ? (
                            <Badge variant="filled" color="teal" radius="xl">
                              Active
                            </Badge>
                          ) : null}
                          {state.completedTaskIds.includes(task.id) ? (
                            <Badge variant="light" color="teal" radius="xl">
                              Completed
                            </Badge>
                          ) : null}
                          {state.passedTaskIds.includes(task.id) ? (
                            <Badge variant="light" color="red" radius="xl">
                              Passed
                            </Badge>
                          ) : null}
                        </Group>
                        <Group gap="xs" className="admin-task-actions">
                          <Button
                            size="xs"
                            variant="default"
                            disabled={state.currentTask?.id === task.id}
                            onClick={() =>
                              openConfirmation({
                                title: "Set this as the active task?",
                                message: state.currentTask
                                  ? `This will replace "${state.currentTask.title}" as the live task and put it back into the open pool.`
                                  : `This will make "${task.title}" the live task.`,
                                confirmLabel: "Set active task",
                                confirmColor: "brand",
                                onConfirm: () => setTaskAsActive(task.id)
                              })
                            }
                            className="task-admin-button"
                          >
                            Set Active
                          </Button>
                          <ActionIcon
                            color="red"
                            variant="light"
                            size="lg"
                            radius="xl"
                            onClick={() => removeTask(task.id)}
                            aria-label={`Remove ${task.title}`}
                          >
                            <IconTrash size={18} />
                          </ActionIcon>
                        </Group>
                      </Group>
                      <TextInput
                        label="Title"
                        value={task.title}
                        onChange={(event) =>
                          updateTask(task.id, "title", event.currentTarget.value)
                        }
                      />
                      <Textarea
                        label="Description"
                        value={task.description}
                        onChange={(event) =>
                          updateTask(task.id, "description", event.currentTarget.value)
                        }
                        minRows={3}
                        autosize
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </ScrollArea>
          </Paper>

          <Button
            color="orange"
            variant="default"
            leftSection={<IconPlayerSkipForward size={18} />}
            onClick={() =>
              openConfirmation({
                title: "Reset progress only?",
                message:
                  "This clears completed tasks, passed tasks, the live task, history, and sets passes back to 0. It does not remove any tasks.",
                confirmLabel: "Reset progress",
                confirmColor: "orange",
                onConfirm: resetProgress
              })
            }
          >
            Reset Progress
          </Button>

          <Button
            color="dark"
            variant="subtle"
            leftSection={<IconX size={18} />}
            onClick={() =>
              openConfirmation({
                title: "Reset the whole app?",
                message:
                  "This clears tasks, passes, history, and the saved localStorage state back to the default setup.",
                confirmLabel: "Reset everything",
                confirmColor: "dark",
                onConfirm: resetEverything
              })
            }
          >
            Reset App State
          </Button>
        </Stack>
      </Modal>

      <Modal
        opened={adminLoginOpen}
        onClose={closeAdminLogin}
        centered
        zIndex={460}
        radius="28px"
        padding="xl"
        overlayProps={{ blur: 6, opacity: 0.62 }}
        title={<Title order={3}>Admin Unlock</Title>}
        classNames={{ content: "confirm-modal", header: "admin-modal-header" }}
      >
        <Box component="form" onSubmit={unlockAdmin}>
          <Stack gap="lg">
            <Text>
              Enter the admin password to manage tasks and passes.
            </Text>
            <PasswordInput
              label="Password"
              value={adminPassword}
              onChange={(event) => setAdminPassword(event.currentTarget.value)}
              error={adminPasswordError}
              autoFocus
            />
            <Group grow>
              <Button type="button" variant="default" size="md" onClick={closeAdminLogin}>
                Cancel
              </Button>
              <Button type="submit" size="md" color="brand" loading={authenticatingAdmin}>
                Unlock Admin
              </Button>
            </Group>
          </Stack>
        </Box>
      </Modal>
    </Box>
  );
}

function StatCard({ icon: Icon, label, value, tone }) {
  return (
    <motion.div whileHover={{ y: -6, scale: 1.02 }} transition={{ duration: 0.2 }}>
      <Paper className={`stat-card tone-${tone}`} radius="24px" p="lg">
        <Group justify="space-between">
          <Stack gap={0}>
            <Text size="sm" fw={700} tt="uppercase" className="stat-label">
              {label}
            </Text>
            <Title order={2}>{value}</Title>
          </Stack>
          <ThemeIcon size={54} radius="xl" className="stat-icon">
            <Icon size={26} />
          </ThemeIcon>
        </Group>
      </Paper>
    </motion.div>
  );
}

export default App;
