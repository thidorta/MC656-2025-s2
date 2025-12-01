import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { CourseBlock } from '../types';
import { palette } from '../styles';

// ====================================================================
// BRUNO CALENDAR SYSTEM V3 — STRICT ENGINEERING SPECIFICATION
// ====================================================================

const TIME_SLOTS = Array.from({ length: 17 }, (_, i) => 8 + i); // 8:00 to 24:00 (midnight)
const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const CELL_HEIGHT = 48; // 48px per hour (optimized for screen fit)
const HEADER_HEIGHT = 44; // Day header height
const TIME_COLUMN_WIDTH = 52; // Fixed time column width
const START_HOUR = 8;


interface Props {
  blocks: CourseBlock[];
  onBlockPress?: (code: string) => void;
}

export default function ScheduleGrid({ blocks, onBlockPress }: Props) {
  const { width } = useWindowDimensions();
  
  // Calculate responsive day column width
  const availableWidth = Math.max(width - 2 * 16, 320); // 16px page padding
  const dayColumnWidth = (availableWidth - TIME_COLUMN_WIDTH) / DAYS_OF_WEEK.length;

  // Position blocks on the grid
  const blockPositions = useMemo(
    () =>
      blocks.map((block) => {
        const top = HEADER_HEIGHT + (block.startTime - START_HOUR) * CELL_HEIGHT;
        const left = TIME_COLUMN_WIDTH + block.dayIndex * dayColumnWidth;
        const height = block.durationHours * CELL_HEIGHT;
        const width = dayColumnWidth - 8; // 4px margin on each side

        return {
          ...block,
          style: {
            top: top + 2, // 2px top margin
            left: left + 4, // 4px left margin
            width,
            height: Math.max(height - 6, 44), // Min height 44px, 6px total gap
          },
        };
      }),
    [blocks, dayColumnWidth],
  );

  return (
    <View style={styles.calendarContainer}>
      {/* DAY HEADERS */}
      <View style={[styles.headerRow, { height: HEADER_HEIGHT }]}>
        <View style={[styles.timeHeaderCell, { width: TIME_COLUMN_WIDTH }]} />
        {DAYS_OF_WEEK.map((day, index) => (
          <View
            key={day}
            style={[
              styles.dayHeaderCell,
              { width: dayColumnWidth },
              index > 0 && styles.dayHeaderBorder,
            ]}
          >
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {/* GRID CONTAINER */}
      <View style={styles.gridContainer}>
        {/* TIME COLUMN */}
        <View style={[styles.timeColumn, { width: TIME_COLUMN_WIDTH }]}>
          {TIME_SLOTS.map((hour) => (
            <View key={hour} style={[styles.timeCell, { height: CELL_HEIGHT }]}>
              <Text style={styles.timeText}>{`${hour}:00`}</Text>
            </View>
          ))}
        </View>

        {/* DAY COLUMNS */}
        <View style={styles.dayColumnsContainer}>
          {DAYS_OF_WEEK.map((day, dayIndex) => (
            <View
              key={day}
              style={[
                styles.dayColumn,
                { width: dayColumnWidth },
                dayIndex > 0 && styles.dayColumnBorder,
              ]}
            >
              {TIME_SLOTS.map((hour, hourIndex) => (
                <View
                  key={hour}
                  style={[
                    styles.gridCell,
                    { height: CELL_HEIGHT },
                    hourIndex > 0 && styles.gridCellBorder,
                  ]}
                />
              ))}
            </View>
          ))}
        </View>

        {/* LESSON BLOCKS (ABSOLUTE POSITIONING) */}
        {blockPositions.map((block) => (
            <TouchableOpacity
              key={block.id}
              style={[styles.lessonBlock, block.style]}
              activeOpacity={0.85}
              onPress={() => onBlockPress?.(block.code)}
            >
              {/* BACKGROUND GLOW (SUBTLE) */}
              <View
                style={[
                  styles.lessonGlow,
                  {
                    backgroundColor: block.difficultyRated
                      ? resolveDifficultyBg(block.difficultyLevel)
                      : 'rgba(255,255,255,0.05)',
                  },
                ]}
              />

              {/* LEFT NEON INDICATOR */}
              <View style={[styles.lessonLeftBar, { backgroundColor: resolveStateColor(block) }]} />

              {/* RIGHT NEON DOT */}
              <View
                style={[
                  styles.lessonRightDot,
                  {
                    backgroundColor: resolveStateColor(block),
                    borderColor: `${resolveStateColor(block)}50`,
                  },
                ]}
              />

              {/* CONTENT */}
              <View style={styles.lessonContent}>
                <Text style={styles.lessonTitle} numberOfLines={2}>
                  {block.name || block.code}
                </Text>
                {block.name && (
                  <Text style={styles.lessonCode} numberOfLines={1}>
                    {block.code}
                  </Text>
                )}
              </View>

              {/* DIFFICULTY RIBBON (BOTTOM) */}
              {block.difficultyLabel && (
                <View
                  style={[
                    styles.difficultyRibbon,
                    {
                      backgroundColor: block.difficultyRated
                        ? resolveDifficultyBg(block.difficultyLevel)
                        : 'rgba(255,255,255,0.08)',
                      borderTopColor: block.difficultyRated
                        ? resolveDifficultyBorder(block.difficultyLevel)
                        : 'rgba(255,255,255,0.18)',
                    },
                  ]}
                >
                  <View style={styles.difficultyRibbonInner}>
                    <View
                      style={[
                        styles.difficultyDot,
                        {
                          backgroundColor: block.difficultyRated
                            ? resolveDifficultyColor(block.difficultyLevel)
                            : palette.textMuted,
                        },
                      ]}
                    />
                    <Text
                      style={[
                        styles.difficultyText,
                        {
                          color: block.difficultyRated
                            ? resolveDifficultyColor(block.difficultyLevel)
                            : palette.textMuted,
                        },
                      ]}
                    >
                      {block.difficultyLabel}
                    </Text>
                  </View>
                </View>
              )}
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
}

// ====================================================================
// HELPER FUNCTIONS
// ====================================================================

function resolveStateColor(block: CourseBlock): string {
  // For now, default to accent color
  // TODO: Map actual course status when available
  return palette.accent;
}

function resolveDifficultyColor(level?: 'easy' | 'medium' | 'hard' | null): string {
  if (level === 'easy') return palette.difficultyEasy;
  if (level === 'hard') return palette.difficultyHard;
  return palette.difficultyMedium;
}

function resolveDifficultyBg(level?: 'easy' | 'medium' | 'hard' | null): string {
  if (level === 'easy') return palette.difficultyEasyBg;
  if (level === 'hard') return palette.difficultyHardBg;
  return palette.difficultyMediumBg;
}

function resolveDifficultyBorder(level?: 'easy' | 'medium' | 'hard' | null): string {
  if (level === 'easy') return 'rgba(0,255,156,0.45)';
  if (level === 'hard') return 'rgba(255,61,61,0.45)';
  return 'rgba(255,230,0,0.45)';
}


// ====================================================================
// BRUNO CALENDAR STYLES — STRICT ENGINEERING SPEC
// ====================================================================

const styles = StyleSheet.create({
  // MAIN CONTAINER
  calendarContainer: {
    backgroundColor: palette.surface, // #141414
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
  },

  // DAY HEADERS
  headerRow: {
    flexDirection: 'row',
    backgroundColor: palette.surface, // #141414
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  timeHeaderCell: {
    backgroundColor: palette.surface,
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: palette.surface,
  },
  dayHeaderBorder: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
    letterSpacing: 0.3,
  },

  // GRID CONTAINER
  gridContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: palette.surface2, // #1E1E1E (grid surface)
  },

  // TIME COLUMN
  timeColumn: {
    backgroundColor: palette.surface, // #141414
    borderRightWidth: 1,
    borderRightColor: palette.border,
  },
  timeCell: {
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  timeText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.45)', // Muted time labels
    letterSpacing: 0.2,
  },

  // DAY COLUMNS
  dayColumnsContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  dayColumn: {
    backgroundColor: palette.surface2,
  },
  dayColumnBorder: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  gridCell: {
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  gridCellBorder: {
    borderTopWidth: 0, // Remove double borders
  },

  // LESSON BLOCK (ABSOLUTE POSITIONED)
  lessonBlock: {
    position: 'absolute',
    backgroundColor: palette.surface2, // #1E1E1E
    borderRadius: 6,
    borderWidth: 1,
    borderColor: palette.border,
    paddingTop: 8,
    paddingBottom: 24, // Space for ribbon
    paddingHorizontal: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
    zIndex: 10,
  },
  lessonGlow: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.35,
  },
  lessonLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  lessonRightDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
    borderWidth: 1,
  },
  lessonContent: {
    paddingLeft: 6,
    paddingRight: 16,
  },
  lessonTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: palette.text,
    letterSpacing: 0.2,
    lineHeight: 16,
  },
  lessonCode: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.65)',
    marginTop: 1,
    letterSpacing: 0.2,
  },

  // DIFFICULTY RIBBON (BOTTOM)
  difficultyRibbon: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  difficultyRibbonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    columnGap: 6,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  difficultyText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
});
