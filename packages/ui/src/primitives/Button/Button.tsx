import React from 'react'
import { Button as AriaButton } from 'react-aria-components'
import './Button.css'

export interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'danger'
  size?: 'small' | 'medium' | 'large'
  children: React.ReactNode
  onPress?: () => void
  isDisabled?: boolean
  className?: string
  type?: 'button' | 'submit' | 'reset'
}

export const Button = ({
  variant = 'primary',
  size = 'medium',
  children,
  onPress,
  isDisabled = false,
  className = '',
  type = 'button',
  ...props
}: ButtonProps) => {
  return (
    <AriaButton
      onPress={onPress}
      isDisabled={isDisabled}
      type={type}
      className={`btn btn-${variant} btn-${size} ${className}`}
      {...props}
    >
      {children}
    </AriaButton>
  )
}

export default Button
