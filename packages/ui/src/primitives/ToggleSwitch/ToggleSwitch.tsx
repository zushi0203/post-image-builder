import React from 'react'
import { Switch } from 'react-aria-components'
import './ToggleSwitch.css'

export interface ToggleSwitchProps {
  isSelected?: boolean
  onChange?: (isSelected: boolean) => void
  children?: React.ReactNode
  className?: string
  'aria-label'?: string
}

export const ToggleSwitch = ({
  isSelected = false,
  onChange,
  children,
  className = '',
  'aria-label': ariaLabel,
  ...props
}: ToggleSwitchProps) => {
  return (
    <div className={`toggle-switch-container ${className}`}>
      {children && <span className="toggle-switch-label">{children}</span>}
      <Switch
        isSelected={isSelected}
        onChange={onChange}
        aria-label={ariaLabel}
        className="toggle-switch"
        {...props}
      >
        <div className="toggle-switch-indicator" />
      </Switch>
    </div>
  )
}

export default ToggleSwitch
