import React, { useMemo } from 'react';
import { View, Text, useWindowDimensions } from 'react-native';
import { CourseBlock } from '../types';
import { gridStyles } from '../styles';

const TIME_SLOTS = Array.from({ length: 16 }, (_, i) => `${8 + i}:00`);
const DAYS_OF_WEEK = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
const CELL_HEIGHT = 40;
const HEADER_ROW_HEIGHT = CELL_HEIGHT;
const START_HOUR = 8;

interface Props {
  blocks: CourseBlock[];
}

export default function ScheduleGrid({ blocks }: Props) {
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
    <View style={gridStyles.card}>
      <View style={[gridStyles.headerRow, { height: HEADER_ROW_HEIGHT }]}>
        <View style={[gridStyles.cornerCell, { width: timeColumnWidth }]} />
        {DAYS_OF_WEEK.map((day) => (
          <View key={day} style={[gridStyles.dayHeaderCell, { width: dayColumnWidth }]}>
            <Text style={gridStyles.dayHeaderText}>{day}</Text>
          </View>
        ))}
      </View>

      {TIME_SLOTS.map((time) => (
        <View key={time} style={[gridStyles.row, { height: CELL_HEIGHT }]}>
          <View style={[gridStyles.timeCell, { width: timeColumnWidth }]}>
            <Text style={gridStyles.timeText}>{time}</Text>
          </View>
          {DAYS_OF_WEEK.map((day) => (
            <View key={day} style={[gridStyles.cell, { width: dayColumnWidth }]} />
          ))}
        </View>
      ))}

      {blockPositions.map((block) => (
        <View key={block.id} style={[gridStyles.block, block.style]}>
          <Text style={gridStyles.blockText}>{block.code}</Text>
        </View>
      ))}
    </View>
  );
}
