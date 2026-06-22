import React, {useMemo, useState} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  ScrollView,
  FlatList,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  SafeAreaView,
} from 'react-native';
import {NativeStackScreenProps} from '@react-navigation/native-stack';
import DateTimePicker, {
  DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import {Calendar} from 'react-native-big-calendar';
import {
  Search,
  SlidersHorizontal,
  CalendarDays,
  CircleHelp,
  Home,
  Medal,
  CheckCircle2,
  LayoutGrid,
  Timer,
  Clock3,
  Check,
  Trophy,
  Repeat,
  ChevronRight,
} from 'lucide-react-native';
import {appColors} from '../theme/colors';
import {useHabitsStore} from '../store/habits';
import {useTasksStore} from '../store/tasks';
import {RootStackParamList} from '../types/navigation';

type ActivityItem = {
  id: string;
  type: 'habit' | 'task' | 'todo' | 'pending_task';
  title: string;
  time: string;
  done?: boolean;
};

type DayChip = {
  key: string;
  weekday: string;
  day: number;
};

type FooterTab = 'Home' | 'Habits' | 'Tasks' | 'Planner' | 'Timer';
type QuickAddItem = {
  id: 'habit' | 'task' | 'priority' | 'recurring_task';
  title: string;
  subtitle: string;
  icon: string;
};

function ScreenLayout({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle: string;
  actions?: React.ReactNode;
}) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.actions}>{actions}</View>
    </View>
  );
}

function NavButton({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonText}>{label}</Text>
    </Pressable>
  );
}

function DateChip({
  item,
  selected,
  onPress,
}: {
  item: DayChip;
  selected: boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      style={[styles.dateChip, selected ? styles.dateChipSelected : null]}
      onPress={onPress}>
      <Text
        style={[
          styles.dateWeekday,
          selected ? styles.dateWeekdaySelected : null,
        ]}>
        {item.weekday}
      </Text>
      <Text style={[styles.dateDay, selected ? styles.dateDaySelected : null]}>
        {item.day}
      </Text>
    </Pressable>
  );
}

function ActivityRow({item}: {item: ActivityItem}): React.JSX.Element {
  return (
    <View style={styles.activityRow}>
      <View style={styles.activityMeta}>
        <Text style={styles.activityType}>{item.type.toUpperCase()}</Text>
        <Text style={styles.activityTitle}>{item.title}</Text>
      </View>
      <Text style={styles.activityTime}>{item.time}</Text>
    </View>
  );
}

const DRAWER_WIDTH = Math.round(Dimensions.get('window').width * 0.6);
const TOTAL_DAYS = 20001;
const TODAY_INDEX = Math.floor(TOTAL_DAYS / 2);
const DATE_CHIP_TOTAL = 66;
const FOOTER_TABS: FooterTab[] = [
  'Home',
  'Habits',
  'Tasks',
  'Planner',
  'Timer',
];
const FOOTER_ICONS: Record<FooterTab, string> = {
  Home: 'home',
  Habits: 'medal',
  Tasks: 'tasks',
  Planner: 'categories',
  Timer: 'timer',
};
const QUICK_ADD_ITEMS: QuickAddItem[] = [
  {
    id: 'habit',
    title: 'Habit',
    subtitle:
      'Activity that repeats over time. It has detailed tracking and statistics.',
    icon: 'trophy',
  },
  {
    id: 'task',
    title: 'Task',
    subtitle: 'Activity that repeats over time without tracking or statistics.',
    icon: 'repeat',
  },
  {
    id: 'priority',
    title: 'Priority',
    subtitle: 'Single instance activity without tracking over time.',
    icon: 'check',
  },
];

function FooterIcon({name, active}: {name: string; active: boolean}) {
  const color = active ? '#E72372' : '#A5A8B1';
  if (name === 'home') {
    return <Home size={20} color={color} strokeWidth={2} />;
  }
  if (name === 'medal') {
    return <Medal size={20} color={color} strokeWidth={2} />;
  }
  if (name === 'tasks') {
    return <CheckCircle2 size={20} color={color} strokeWidth={2} />;
  }
  if (name === 'categories') {
    return <LayoutGrid size={20} color={color} strokeWidth={2} />;
  }
  return <Timer size={20} color={color} strokeWidth={2} />;
}

function QuickAddIcon({name}: {name: string}) {
  const color = '#F02A78';
  if (name === 'trophy') {
    return <Trophy size={20} color={color} strokeWidth={2} />;
  }
  if (name === 'repeat') {
    return <Repeat size={20} color={color} strokeWidth={2} />;
  }
  return <Check size={20} color={color} strokeWidth={2.4} />;
}

const plannerEventCellStyle = {
  backgroundColor: '#E72372',
  borderRadius: 10,
};

export function DashboardScreen(): React.JSX.Element {
  const tasks = useTasksStore(state => state.tasks);
  const addTask = useTasksStore(state => state.addTask);
  const toggleTaskCompletion = useTasksStore(
    state => state.toggleTaskCompletion,
  );

  const [activeTab, setActiveTab] = useState<FooterTab>('Home');
  const [bottomSheet, setBottomSheet] = useState<
    'none' | 'quickAdd' | 'taskForm'
  >('none');
  const [plannerMode, setPlannerMode] = useState<'day' | 'week' | 'month'>(
    'week',
  );
  const [taskTitle, setTaskTitle] = useState('');
  const [taskTitleError, setTaskTitleError] = useState('');
  const [taskDate, setTaskDate] = useState(new Date());
  const [showTaskDatePicker, setShowTaskDatePicker] = useState(false);
  const quickAddOpen = bottomSheet === 'quickAdd';
  const taskFormOpen = bottomSheet === 'taskForm';

  const statusBarInset =
    Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerX = useState(new Animated.Value(-DRAWER_WIDTH))[0];
  const overlayOpacity = useState(new Animated.Value(0))[0];

  const dayIndexes = useMemo<number[]>(
    () => Array.from({length: TOTAL_DAYS}, (_, i) => i),
    [],
  );

  const [selectedDateKey, setSelectedDateKey] = useState(
    new Date().toISOString().slice(0, 10),
  );

  const activitiesByDate = useMemo<Record<string, ActivityItem[]>>(() => {
    return {};
  }, []);

  const selectedActivities = useMemo(() => {
    const base = activitiesByDate[selectedDateKey] ?? [];
    const pendingTasks = tasks
      .filter(task => {
        if (selectedDateKey < task.startDate) {
          return false;
        }
        if (!task.completedDate) {
          return true;
        }
        return selectedDateKey <= task.completedDate;
      })
      .map(task => ({
        id: task.id,
        type: 'pending_task' as const,
        title: task.title,
        time: '',
        done: task.completedDate === selectedDateKey,
      }));
    return [...pendingTasks, ...base];
  }, [activitiesByDate, selectedDateKey, tasks]);

  const plannerEvents = useMemo(() => {
    return tasks.map((task, index) => {
      const start = new Date(`${task.startDate}T09:00:00`);
      start.setHours(9 + (index % 8), 0, 0, 0);
      const end = new Date(start);
      end.setHours(start.getHours() + 1);
      return {
        title: task.title,
        start,
        end,
      };
    });
  }, [tasks]);

  const todayKey = new Date().toISOString().slice(0, 10);
  const headerTitle =
    selectedDateKey === todayKey
      ? 'Today'
      : new Date(`${selectedDateKey}T00:00:00`).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });

  const nowForDrawer = new Date();
  const drawerWeekday = nowForDrawer.toLocaleDateString('en-US', {
    weekday: 'long',
  });
  const drawerDate = nowForDrawer.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  const getDayChip = (index: number): DayChip => {
    const now = new Date();
    const offset = index - TODAY_INDEX;
    const d = new Date(now);
    d.setDate(now.getDate() + offset);
    return {
      key: d.toISOString().slice(0, 10),
      weekday: d.toLocaleDateString('en-US', {weekday: 'short'}),
      day: d.getDate(),
    };
  };

  const openDrawer = () => {
    setDrawerOpen(true);
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 220,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerX, {
        toValue: -DRAWER_WIDTH,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(({finished}) => {
      if (finished) {
        setDrawerOpen(false);
      }
    });
  };

  const openTaskForm = () => {
    setTaskTitle('');
    setTaskTitleError('');
    setTaskDate(new Date(`${selectedDateKey}T00:00:00`));
    setShowTaskDatePicker(false);
    setBottomSheet('taskForm');
  };

  const onQuickAddPress = (id: QuickAddItem['id']) => {
    const isTaskType =
      id === 'task' || id === 'priority' || id === 'recurring_task';
    if (isTaskType) {
      openTaskForm();
      return;
    }
    setBottomSheet('none');
  };

  const onTaskDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowTaskDatePicker(false);
    }
    if (event.type === 'dismissed' || !date) {
      return;
    }
    setTaskDate(date);
  };

  const confirmCreateTask = () => {
    if (!taskTitle.trim()) {
      setTaskTitleError('Task name is required');
      return;
    }
    const dateKey = taskDate.toISOString().slice(0, 10);
    addTask(taskTitle, dateKey);
    setBottomSheet('none');
    setTaskTitle('');
    setTaskTitleError('');
    setSelectedDateKey(dateKey);
  };

  return (
    <View style={[styles.todayRoot, {paddingTop: statusBarInset + 50}]}>
      <View style={styles.todayHeader}>
        <View style={styles.todayHeaderLeft}>
          <Pressable onPress={openDrawer} hitSlop={8}>
            <Text style={[styles.iconText, styles.menuIconText]}>≡</Text>
          </Pressable>
          <Text style={styles.todayTitle}>{headerTitle}</Text>
        </View>
        <View style={styles.todayHeaderActions}>
          <Search size={24} color="#F1F1F3" strokeWidth={2} />
          <SlidersHorizontal size={24} color="#F1F1F3" strokeWidth={2} />
          <CalendarDays size={24} color="#F1F1F3" strokeWidth={2} />
          <CircleHelp size={24} color="#F1F1F3" strokeWidth={2} />
        </View>
      </View>

      <FlatList
        horizontal
        style={styles.dateRow}
        data={dayIndexes}
        initialScrollIndex={TODAY_INDEX}
        getItemLayout={(_, index) => ({
          length: DATE_CHIP_TOTAL,
          offset: DATE_CHIP_TOTAL * index,
          index,
        })}
        contentContainerStyle={styles.dateRowContent}
        showsHorizontalScrollIndicator={false}
        keyExtractor={item => String(item)}
        renderItem={({item}) => {
          const d = getDayChip(item);
          return (
            <DateChip
              item={d}
              selected={selectedDateKey === d.key}
              onPress={() => setSelectedDateKey(d.key)}
            />
          );
        }}
      />

      <View style={styles.todayBody}>
        {activeTab === 'Planner' ? (
          <View style={styles.plannerWrap}>
            <View style={styles.plannerModeRow}>
              {(['day', 'week', 'month'] as const).map(mode => (
                <Pressable
                  key={mode}
                  style={[
                    styles.plannerModeBtn,
                    plannerMode === mode ? styles.plannerModeBtnActive : null,
                  ]}
                  onPress={() => setPlannerMode(mode)}>
                  <Text
                    style={[
                      styles.plannerModeText,
                      plannerMode === mode
                        ? styles.plannerModeTextActive
                        : null,
                    ]}>
                    {mode === 'day'
                      ? 'Day'
                      : mode === 'week'
                      ? 'Work Week'
                      : 'Month'}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Calendar
              events={plannerEvents}
              height={560}
              mode={plannerMode}
              date={new Date(`${selectedDateKey}T00:00:00`)}
              theme={{
                palette: {
                  primary: '#E72372',
                  nowIndicator: '#E72372',
                  gray: {
                    100: '#0F1014',
                    200: '#17191F',
                    300: '#252833',
                    500: '#9094A0',
                    800: '#E7E9EF',
                  },
                },
              }}
              eventCellStyle={plannerEventCellStyle}
              eventCellTextColor="#FFFFFF"
            />
          </View>
        ) : selectedActivities.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyIcon}>📅</Text>
            <Text style={styles.emptyTitle}>No activities scheduled</Text>
            <Text style={styles.emptySubtitle}>
              Add something to plan your day
            </Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.activitiesWrap}>
            {selectedActivities.map(item => {
              if (item.type === 'pending_task') {
                return (
                  <View key={item.id} style={styles.taskRow}>
                    <View style={styles.taskLeft}>
                      <View style={styles.taskIconBadge}>
                        <Clock3 size={18} color="#0A0A0D" strokeWidth={2.4} />
                      </View>
                      <View>
                        <Text style={styles.taskTitle}>{item.title}</Text>
                        <Text style={styles.taskChip}>Task</Text>
                      </View>
                    </View>
                    <Pressable
                      style={[
                        styles.taskToggle,
                        item.done ? styles.taskToggleDone : null,
                      ]}
                      onPress={() =>
                        toggleTaskCompletion(item.id, selectedDateKey)
                      }>
                      {item.done ? (
                        <Check size={20} color="#FFFFFF" strokeWidth={3} />
                      ) : null}
                    </Pressable>
                  </View>
                );
              }
              return <ActivityRow key={item.id} item={item} />;
            })}
          </ScrollView>
        )}
      </View>

      <Pressable style={styles.fab} onPress={() => setBottomSheet('quickAdd')}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>

      <View style={styles.footerBar}>
        {FOOTER_TABS.map(item => {
          const active = activeTab === item;
          const isHome = item === 'Home';
          const label = isHome ? (active ? 'Today' : 'Home') : item;
          return (
            <Pressable
              key={item}
              style={styles.footerItem}
              onPress={() => setActiveTab(item)}>
              <FooterIcon name={FOOTER_ICONS[item]} active={active} />
              <Text
                style={[
                  styles.footerLabel,
                  active ? styles.footerLabelActive : null,
                ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {drawerOpen ? (
        <View style={styles.drawerLayer} pointerEvents="box-none">
          <Pressable style={StyleSheet.absoluteFill} onPress={closeDrawer}>
            <Animated.View
              style={[styles.drawerOverlay, {opacity: overlayOpacity}]}
            />
          </Pressable>
          <Animated.View
            style={[
              styles.drawerPanel,
              {width: DRAWER_WIDTH, transform: [{translateX: drawerX}]},
            ]}>
            <Text style={styles.drawerBrand}>Ismail Now</Text>
            <Text style={styles.drawerDateTitle}>{drawerWeekday}</Text>
            <Text style={styles.drawerDateSub}>{drawerDate}</Text>

            <View style={styles.drawerDivider} />
            <Text style={styles.drawerItem}>News and events</Text>
            <Text style={styles.drawerItem}>Categories</Text>
            <Text style={styles.drawerItem}>Timer</Text>
            <View style={styles.drawerDivider} />
            <Text style={styles.drawerItem}>Customize</Text>
            <Text style={styles.drawerItem}>Settings</Text>
            <Text style={styles.drawerItem}>Account and Backups</Text>
            <View style={styles.drawerDivider} />
            <Text style={styles.drawerItem}>Premium</Text>
            <Text style={styles.drawerItem}>Rate this app</Text>
            <Text style={styles.drawerItem}>Contact us</Text>
          </Animated.View>
        </View>
      ) : null}

      {quickAddOpen ? (
        <View style={styles.quickAddLayer} pointerEvents="box-none">
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setBottomSheet('none')}>
            <View style={styles.quickAddOverlay} />
          </Pressable>
          <View style={styles.quickAddPanel}>
            {QUICK_ADD_ITEMS.map((item, index) => (
              <View key={item.id}>
                <Pressable
                  style={styles.quickAddRow}
                  onPress={() => onQuickAddPress(item.id)}>
                  <View style={styles.quickAddIconWrap}>
                    <QuickAddIcon name={item.icon} />
                  </View>
                  <View style={styles.quickAddTextWrap}>
                    <Text style={styles.quickAddTitle}>{item.title}</Text>
                    <Text style={styles.quickAddSubtitle}>{item.subtitle}</Text>
                  </View>
                  <ChevronRight size={22} color="#8A8E99" strokeWidth={2.2} />
                </Pressable>
                {index < QUICK_ADD_ITEMS.length - 1 ? (
                  <View style={styles.quickAddDivider} />
                ) : null}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {taskFormOpen ? (
        <KeyboardAvoidingView
          style={styles.quickAddLayer}
          pointerEvents="box-none"
          behavior={Platform.OS === 'ios' ? 'position' : undefined}
          keyboardVerticalOffset={statusBarInset + 20}>
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.quickAddOverlay} />
          </View>
          <View style={styles.modalBottomWrap}>
            <SafeAreaView>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.taskFormScrollContent}>
                <View style={styles.taskFormPanel}>
                  <Text style={styles.taskFormHeading}>New Task</Text>
                  <TextInput
                    value={taskTitle}
                    onChangeText={text => {
                      setTaskTitle(text);
                      if (taskTitleError) {
                        setTaskTitleError('');
                      }
                    }}
                    placeholder="Task"
                    placeholderTextColor="#8B8D95"
                    style={[
                      styles.taskInput,
                      taskTitleError ? styles.taskInputError : null,
                    ]}
                  />
                  {taskTitleError ? (
                    <Text style={styles.taskErrorText}>{taskTitleError}</Text>
                  ) : null}
                  <View style={styles.taskDateRow}>
                    <Text style={styles.taskDateLabel}>Date</Text>
                    <Pressable
                      style={styles.taskDateButton}
                      onPress={() => setShowTaskDatePicker(true)}>
                      <Text style={styles.taskDateButtonText}>
                        {taskDate.toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </Text>
                    </Pressable>
                  </View>
                  {showTaskDatePicker ? (
                    <DateTimePicker
                      value={taskDate}
                      mode="date"
                      display={
                        Platform.OS === 'android' ? 'calendar' : 'spinner'
                      }
                      onChange={onTaskDateChange}
                      textColor="#FFFFFF"
                    />
                  ) : null}
                  <View style={styles.taskFormActions}>
                    <Pressable
                      onPress={() => {
                        setBottomSheet('none');
                      }}>
                      <Text style={styles.taskFormCancel}>CANCEL</Text>
                    </Pressable>
                    <Pressable onPress={confirmCreateTask}>
                      <Text style={styles.taskFormConfirm}>CONFIRM</Text>
                    </Pressable>
                  </View>
                </View>
              </ScrollView>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      ) : null}
    </View>
  );
}

export function HabitEditorScreen(): React.JSX.Element {
  return (
    <ScreenLayout
      title="Habit Editor"
      subtitle="Create/edit habit form will be implemented next from documentation."
    />
  );
}

export function HistoryScreen(): React.JSX.Element {
  return (
    <ScreenLayout
      title="History"
      subtitle="History timeline and analytics cards will be added iteratively."
    />
  );
}

export function SettingsScreen(): React.JSX.Element {
  return (
    <ScreenLayout
      title="Settings"
      subtitle="Notification, localization, and app preferences go here."
    />
  );
}

export function BackupScreen(): React.JSX.Element {
  return (
    <ScreenLayout
      title="Backup"
      subtitle="Google Drive CSV backup flow will be integrated here."
    />
  );
}

export function HabitDetailsScreen({
  route,
}: NativeStackScreenProps<
  RootStackParamList,
  'HabitDetails'
>): React.JSX.Element {
  const {habitId} = route.params as {habitId: string};
  const habit = useHabitsStore(state =>
    state.habits.find(h => h.id === habitId),
  );
  const habitName = habit?.name ?? 'Habit Details';
  const logCompletion = useHabitsStore(state => state.logCompletion);
  return (
    <ScreenLayout
      title="Habit Details"
      subtitle={habitName}
      actions={
        <NavButton
          label="Log Completion"
          onPress={() => habitId && logCompletion(habitId)}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  todayRoot: {
    flex: 1,
    backgroundColor: '#070709',
    paddingTop: 8,
  },
  todayHeader: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  todayHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  todayHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconText: {
    color: '#F1F1F3',
    fontSize: 20,
  },
  menuIconText: {
    fontSize: 28,
  },
  todayTitle: {
    color: '#F7F7FA',
    fontSize: 22,
    fontWeight: '700',
  },
  dateRow: {
    maxHeight: 66,
  },
  dateRowContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  dateChip: {
    width: 56,
    height: 60,
    borderRadius: 14,
    backgroundColor: '#1A1B20',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dateChipSelected: {
    backgroundColor: '#DD1767',
  },
  dateWeekday: {
    color: '#B9BBC2',
    fontSize: 12,
  },
  dateWeekdaySelected: {
    color: '#FFFFFF',
  },
  dateDay: {
    color: '#ECECF0',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 26,
  },
  dateDaySelected: {
    color: '#FFFFFF',
  },
  todayBody: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
    paddingBottom: 98,
  },
  emptyWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  emptyIcon: {
    fontSize: 46,
  },
  emptyTitle: {
    color: '#ECECF0',
    fontSize: 24,
    fontWeight: '700',
  },
  emptySubtitle: {
    color: '#9B9EA7',
    fontSize: 16,
  },
  activitiesWrap: {
    gap: 10,
    paddingBottom: 16,
  },
  plannerWrap: {
    flex: 1,
    backgroundColor: '#0A0B0F',
    borderRadius: 14,
    padding: 10,
  },
  plannerModeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  plannerModeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#181A22',
  },
  plannerModeBtnActive: {
    backgroundColor: '#4A1226',
  },
  plannerModeText: {
    color: '#B1B4BF',
    fontSize: 12,
    fontWeight: '600',
  },
  plannerModeTextActive: {
    color: '#F33D87',
  },
  activityRow: {
    backgroundColor: '#15161B',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activityMeta: {
    gap: 3,
  },
  activityType: {
    color: '#DD1767',
    fontWeight: '700',
    fontSize: 12,
    letterSpacing: 0.6,
  },
  activityTitle: {
    color: '#ECECF0',
    fontSize: 16,
    fontWeight: '600',
  },
  activityTime: {
    color: '#B8BBC4',
    fontSize: 14,
  },
  taskRow: {
    borderBottomColor: '#1C1E24',
    borderBottomWidth: 1,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  taskIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 9,
    backgroundColor: '#E72372',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskIcon: {
    color: '#0A0A0D',
    fontSize: 20,
  },
  taskTitle: {
    color: '#F2F3F7',
    fontSize: 15,
    fontWeight: '500',
  },
  taskChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    color: '#F02A78',
    backgroundColor: '#38111F',
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
    fontSize: 12,
    fontWeight: '600',
  },
  taskToggle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2A2A2E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskToggleDone: {
    backgroundColor: '#008C42',
  },
  taskToggleIcon: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
  },
  fab: {
    position: 'absolute',
    right: 22,
    bottom: 92,
    width: 62,
    height: 62,
    borderRadius: 20,
    backgroundColor: '#D81764',
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 34,
    lineHeight: 34,
    fontWeight: '700',
  },
  footerBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#14151A',
    borderTopColor: '#23252B',
    borderTopWidth: 1,
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 14,
    flexDirection: 'row',
  },
  footerItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  footerLabel: {
    color: '#A5A8B1',
    fontSize: 13,
    fontWeight: '600',
  },
  footerIcon: {
    color: '#A5A8B1',
    fontSize: 18,
    marginBottom: 3,
  },
  footerLabelActive: {
    color: '#E72372',
  },
  drawerLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    opacity: 0.35,
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    backgroundColor: '#050507',
    paddingTop: 56,
    paddingHorizontal: 16,
  },
  drawerBrand: {
    color: '#E72372',
    fontSize: 36,
    fontWeight: '700',
  },
  drawerDateTitle: {
    marginTop: 8,
    color: '#D7D8DC',
    fontSize: 18,
    fontWeight: '700',
  },
  drawerDateSub: {
    marginTop: 2,
    color: '#9B9EA7',
    fontSize: 16,
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#1A1C22',
    marginVertical: 20,
  },
  drawerItem: {
    color: '#C8CAD0',
    fontSize: 18,
    paddingVertical: 10,
  },
  quickAddLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 60,
    justifyContent: 'flex-end',
  },
  modalBottomWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  taskFormScrollContent: {
    justifyContent: 'flex-end',
  },
  quickAddOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    opacity: 0.7,
  },
  quickAddPanel: {
    backgroundColor: '#090A0D',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingVertical: 10,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  quickAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  quickAddIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2A0A17',
    marginRight: 12,
  },
  quickAddIcon: {
    color: '#F02A78',
    fontSize: 20,
  },
  quickAddTextWrap: {
    flex: 1,
    paddingRight: 8,
  },
  quickAddTitle: {
    color: '#F2F3F7',
    fontSize: 18,
    fontWeight: '600',
  },
  quickAddSubtitle: {
    marginTop: 2,
    color: '#ACAFB8',
    fontSize: 13,
    lineHeight: 18,
  },
  quickAddChevron: {
    color: '#8A8E99',
    fontSize: 28,
    lineHeight: 28,
  },
  quickAddDivider: {
    height: 1,
    backgroundColor: '#1C1E25',
    marginHorizontal: 12,
  },
  taskFormPanel: {
    backgroundColor: '#090A0D',
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: 16,
    paddingTop: 18,
    paddingBottom: 24,
    marginHorizontal: 8,
    marginBottom: 8,
  },
  taskFormHeading: {
    color: '#EFEFF4',
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 14,
  },
  taskInput: {
    borderWidth: 1,
    borderColor: '#E72372',
    borderRadius: 12,
    paddingHorizontal: 12,
    color: '#FFFFFF',
    fontSize: 16,
    minHeight: 52,
  },
  taskInputError: {
    borderColor: '#FF5B8F',
  },
  taskErrorText: {
    marginTop: 6,
    color: '#FF7DA5',
    fontSize: 12,
    fontWeight: '600',
  },
  taskDateRow: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  taskDateLabel: {
    color: '#E7E8ED',
    fontSize: 16,
    fontWeight: '600',
  },
  taskDateButton: {
    backgroundColor: '#3A1020',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  taskDateButtonText: {
    color: '#F02A78',
    fontSize: 15,
    fontWeight: '700',
  },
  taskFormActions: {
    marginTop: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  taskFormCancel: {
    color: '#E5E7EB',
    fontSize: 18,
    fontWeight: '700',
  },
  taskFormConfirm: {
    color: '#F02A78',
    fontSize: 18,
    fontWeight: '800',
  },
  container: {
    flex: 1,
    backgroundColor: appColors.background,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: appColors.textPrimary,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 15,
    color: appColors.textSecondary,
    lineHeight: 22,
  },
  actions: {
    marginTop: 24,
    gap: 12,
  },
  button: {
    backgroundColor: appColors.primary,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  buttonText: {
    color: appColors.surface,
    fontWeight: '600',
    fontSize: 15,
    textAlign: 'center',
  },
});
