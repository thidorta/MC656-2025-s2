// src/screens/LoginScreen.tsx
import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";

export function LoginScreen({ navigation }: any) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const handleLogin = () => {
    if (!email || !senha) {
      alert("Preencha todos os campos!");
      return;
    }
    // 🔑 Aqui você pode validar no backend depois
    navigation.replace("Home"); // vai para Home depois do login
  };

  return (
    <View className="flex-1 justify-center items-center bg-white p-6">
      <Text className="text-2xl font-bold mb-6 text-blue-800">Login</Text>

      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        className="w-full border border-gray-300 rounded-lg p-3 mb-4"
        placeholder="Senha"
        secureTextEntry
        value={senha}
        onChangeText={setSenha}
      />

      <TouchableOpacity
        className="w-full bg-green-500 py-3 rounded-lg mb-4"
        onPress={handleLogin}
      >
        <Text className="text-white text-center font-semibold">Entrar</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate("Register")}>
        <Text className="text-blue-600">Não tem conta? Registre-se</Text>
      </TouchableOpacity>
    </View>
  );
}
