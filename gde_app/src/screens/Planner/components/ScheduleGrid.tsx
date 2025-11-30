import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions, TouchableOpacity, StyleSheet } from 'react-native';
import { CourseBlock } from '../types';
import { palette } from '../styles';

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => `${8 + i}:00`);
const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const CELL_HEIGHT = 40;
const HEADER_ROW_HEIGHT = CELL_HEIGHT;
const START_HOUR = 8;

interface Props {
  blocks: CourseBlock[];
  onBlockPress?: (code: string) => void;
}

export default function ScheduleGrid({ blocks, onBlockPress }: Props) {
  const { width } = useWindowDimensions();
  const totalWidth = Math.max(width - 2 * 20, 320);
  const timeColumnWidth = totalWidth * 0.18;
  const dayColumnWidth = (totalWidth - timeColumnWidth) / DAYS_OF_WEEK.length;

  const blockPositions = useMemo(
    () =>
      blocks.map((block) => ({
        ...block,
        style: {
          top: HEADER_ROW_HEIGHT + (block.startTime - START_HOUR) * CELL_HEIGHT + 1,
          left: timeColumnWidth + block.dayIndex * dayColumnWidth + 1,
          width: dayColumnWidth - 2,
          height: block.durationHours * CELL_HEIGHT - 2,
        },
      })),
    [blocks, dayColumnWidth, timeColumnWidth],
  );

  return (
    <View style={styles.card}>
      <View style={[styles.headerRow, { height: HEADER_ROW_HEIGHT }]}>
        <View style={[styles.cornerCell, { width: timeColumnWidth }]} />
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={[styles.dayHeaderCell, { width: dayColumnWidth }]}>
            <Text style={styles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {TIME_SLOTS.map((time) => (
        <View key={time} style={[styles.row, { height: CELL_HEIGHT }]}>
          <View style={[styles.timeCell, { width: timeColumnWidth }]}>
            <Text style={styles.timeText}>{time}</Text>
          </View>
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={[styles.cell, { width: dayColumnWidth }]} />
          ))}
        </View>
      ))}

      {blockPositions.map((block) => (
        <TouchableOpacity
          key={block.id}
          style={[styles.block, block.style]}
          activeOpacity={0.85}
          onPress={() => onBlockPress?.(block.code)}
        >
          {/* BRUNO LEFT BAR INDICATOR */}
          <View style={styles.blockLeftBar} />
          <Text style={styles.blockText}>{block.code}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: 4,
    backgroundColor: palette.surface,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.28,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  headerRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
    backgroundColor: palette.surface2,
  },
  cornerCell: {
    paddingVertical: 8,
  },
  dayHeaderCell: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  dayHeaderText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.text,
    letterSpacing: 0.2,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: palette.border,
  },
  timeCell: {
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    backgroundColor: palette.surface2,
    borderRightWidth: 1,
    borderRightColor: palette.border,
  },
  timeText: {
    fontSize: 11,
    color: palette.textSecondary,
  },
  cell: {
    borderLeftWidth: 1,
    borderLeftColor: palette.border,
  },
  block: {
    position: 'absolute',
    backgroundColor: palette.surface2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: palette.border,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    zIndex: 1,
    overflow: 'hidden',
  },
  blockLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: palette.accent,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  blockText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.2,
    paddingLeft: 6,
  },
});
