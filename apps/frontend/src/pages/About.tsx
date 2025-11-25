/*
SPDX-FileCopyrightText: 2025 Gecko Advisor contributors
SPDX-License-Identifier: MIT
*/
import React from 'react';
import AboutCredits from '../components/AboutCredits';
import BackToHome from '../components/BackToHome';
import Footer from '../components/Footer';
import Header from '../components/Header';

export default function AboutRoute() {
  return (
    <>
      <Header />
      <main className="max-w-5xl mx-auto p-6 space-y-6">
        <BackToHome />
        <AboutCredits />
      </main>
      <Footer />
    </>
  );
}
