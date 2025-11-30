import React from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { spacing, palette } from '../styles';
import { CourseNode } from '../types';

interface CourseChipProps {
  course: CourseNode;
  isActive: boolean;
  onToggle: (course: CourseNode) => void;
}

const CourseChip: React.FC<CourseChipProps> = ({ course, isActive, onToggle }) => {
  // Map final_status to display label
  const getStatusLabel = (): string => {
    switch (course.final_status) {
      case 'completed':
        return 'Concluída';
      case 'eligible_and_offered':
        return 'Elegível e ofertada';
      case 'eligible_not_offered':
        return 'Elegível (não ofertada)';
      case 'not_eligible':
        return 'Pré-requisitos pendentes';
      default:
        return '';
    }
  };

  const formatPrereqs = (prereqList: string[]): string[] => {
    if (!Array.isArray(prereqList) || prereqList.length === 0) return ['sem requisitos'];
    return prereqList.length > 0 ? prereqList : ['sem requisitos'];
  };

  // Use backend color_hex for background
  const getBackgroundColor = (): string => {
    return course.color_hex || palette.card;
  };

  // Determinar cor do texto com base no brilho do background
  const getTextColor = (): string => {
    const bgColor = course.color_hex || palette.card;
    // Cores claras do backend: #FFFF66 (amarelo), #DDDDDD (cinza claro)
    if (bgColor === '#FFFF66' || bgColor === '#DDDDDD' || bgColor === '#55CC55') {
      return '#000000'; // texto escuro para fundos claros
    }
    return palette.text; // texto claro para fundos escuros
  };

  const iconForStatus = () => {
    if (course.prereq_status === 'missing') return 'lock-alert';
    if (!course.is_offered) return 'calendar-remove';
    if (course.gde_plan_status === 1) return 'check';
    if (course.final_status === 'completed') return 'check-circle';
    return null;
  };

  // Status icons with size 14
  let statusIcon: React.ReactNode = null;
  const iconColor = getTextColor();
  if (course.final_status === 'completed') {
    statusIcon = (
      <MaterialCommunityIcons name="check-circle-outline" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'eligible_and_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="book-check-outline" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'eligible_not_offered') {
    statusIcon = (
      <MaterialCommunityIcons name="calendar-clock" size={14} color={iconColor} />
    );
  } else if (course.final_status === 'not_eligible') {
    statusIcon = (
      <MaterialCommunityIcons name="close-circle-outline" size={14} color={iconColor} />
    );
  }

  return (
    <TouchableOpacity
      activeOpacity={0.9}
      style={[
        styles.chip,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: palette.border,
        },
        isActive && styles.activeChip,
      ]}
      onPress={() => onToggle(course)}
    >
      <View style={styles.chipContent}>
        {statusIcon}
        <Text style={[styles.chipText, { color: getTextColor() }]}>{course.code}</Text>
        {course.is_offered === 1 && <View style={styles.offeredBadge} />}
        {course.final_status === 'eligible_and_offered' && <View style={styles.eligibleOfferedBadge} />}
      </View>
      <Text style={[styles.metaText, { color: getTextColor(), opacity: 0.7 }]}>{getStatusLabel()}</Text>
      {isActive && (
        <View style={styles.tooltip}>
          <Text style={styles.tooltipLabel}>Requisitos</Text>
          {formatPrereqs(course.prereq_list).map((code, idx, arr) => (
            <Text key={`${course.code}-req-${idx}`} style={styles.tooltipText}>
              {code}
              {idx < arr.length - 1 ? ', ' : ''}
            </Text>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  chip: {
    backgroundColor: palette.card,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    minWidth: 130,
    minHeight: 70,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: palette.cardBorder,
    position: 'relative',
    overflow: 'visible',
    flexGrow: 1,
    width: '46%',
    maxWidth: 170,
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  currentChip: {
    borderColor: palette.accentBorder,
    backgroundColor: palette.accentSoft,
  },
  chipPlanned: {
    backgroundColor: palette.accent,
    borderColor: palette.accent,
  },
  chipBlocked: {
    backgroundColor: palette.dangerSoft,
    borderColor: palette.dangerBorder,
  },
  chipNotOffered: {
    backgroundColor: palette.infoSoft,
    borderColor: palette.infoBorder,
  },
  activeChip: {
    borderColor: palette.accent,
    shadowOpacity: 0.35,
    shadowRadius: 16,
  },
  chipText: {
    color: palette.text,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    flexShrink: 1,
    flexGrow: 1,
    flexBasis: '70%',
    lineHeight: 16,
  },
  chipContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing(0.5),
  },
  statusIcon: {
    marginLeft: 2,
  },
  offeredBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.badgeOffered,
    marginLeft: 6,
  },
  eligibleOfferedBadge: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: palette.badgeEligibleOffered,
    marginLeft: 6,
  },
  metaText: {
    color: palette.textMuted,
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0,
  },
  tooltip: {
    position: 'absolute',
    bottom: '110%',
    left: 0,
    right: 0,
    marginHorizontal: spacing(0.25),
    backgroundColor: '#1F1F22',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    padding: spacing(1.2),
    elevation: 12,
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  tooltipLabel: {
    color: palette.textMuted,
    fontSize: 12,
    marginBottom: 6,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  tooltipText: {
    color: palette.text,
    fontSize: 14,
    lineHeight: 20,
    letterSpacing: -0.1,
  },
});

export default CourseChip;
