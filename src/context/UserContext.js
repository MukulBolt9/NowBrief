// src/context/UserContext.js
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [userName, setUserName] = useState(null);
  const [loaded,   setLoaded]   = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('user_name').then(name => {
      setUserName(name || null);
      setLoaded(true);
    });
  }, []);

  const saveName = async (name) => {
    await AsyncStorage.setItem('user_name', name.trim());
    setUserName(name.trim());
  };

  return (
    <UserContext.Provider value={{ userName, saveName, loaded }}>
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => useContext(UserContext);
