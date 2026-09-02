import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import HomePage from './page';

describe('HomePage', () => {
  it('renders the product name as the main heading', () => {
    render(<HomePage />);

    expect(screen.getByRole('heading', { level: 1, name: /ai observability hub/i })).toBeInTheDocument();
  });

  it('offers a link to check the API health', () => {
    render(<HomePage />);

    const link = screen.getByRole('link', { name: /check api health/i });
    expect(link).toHaveAttribute('href', '/api/health');
  });
});
