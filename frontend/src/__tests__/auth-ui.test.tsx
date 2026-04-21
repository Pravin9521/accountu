import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { LoginPage, SignupPage } from '../main';

describe('Auth UI', () => {
  it('shows validation error when login form is submitted empty', () => {
    render(
      <BrowserRouter>
        <LoginPage />
      </BrowserRouter>
    );

    const button = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(button);

    expect(
      screen.getByText(/email and password are required/i)
    ).toBeInTheDocument();
  });

  it('shows validation error when signup form is submitted with short password', () => {
    render(
      <BrowserRouter>
        <SignupPage />
      </BrowserRouter>
    );

    fireEvent.change(screen.getByLabelText(/name/i), {
      target: { value: 'Test User' },
    });
    fireEvent.change(screen.getByLabelText(/^email$/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: '123' },
    });

    const button = screen.getByRole('button', { name: /sign up/i });
    fireEvent.click(button);

    expect(
      screen.getByText(/password must be at least 6 characters/i)
    ).toBeInTheDocument();
  });
});

