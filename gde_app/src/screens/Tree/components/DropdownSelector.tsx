import React, { useState } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import styles from '../styles';
import { DropdownOption } from '../types';

interface Props {
  label: string;
  value: string | number | null;
  placeholder?: string;
  options: DropdownOption[];
  onSelect: (value: string | number) => void;
}

export default function DropdownSelector({ label, value, placeholder = '*selecionar*', options, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const selectedLabel = options.find((opt) => opt.value === value)?.label;

  return (
    <View style={styles.dropdownWrapper}>
      <TouchableOpacity style={styles.dropdownHeader} onPress={() => setOpen((p) => !p)} activeOpacity={0.85}>
        <View>
          <Text style={styles.dropdownLabel}>{label}</Text>
          <Text style={[styles.dropdownValue, !selectedLabel && styles.dropdownPlaceholder]}>
            {selectedLabel ?? placeholder}
          </Text>
        </View>

        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color="#E0E0E0" />
      </TouchableOpacity>

      {open && (
        <View style={styles.dropdownList}>
          {options.length === 0 ? (
            <Text style={styles.dropdownEmpty}>Nenhuma opcao disponivel</Text>
          ) : (
            options.map((opt) => (
              <TouchableOpacity key={String(opt.value)} style={styles.dropdownOption} onPress={() => { onSelect(opt.value); setOpen(false); }}>
                <Text style={styles.optionText}>{opt.label}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>
      )}
    </View>
  );
}
