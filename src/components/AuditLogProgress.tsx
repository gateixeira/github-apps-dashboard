import { ProgressBar } from '@primer/react';
import { SearchIcon, CheckCircleIcon, SyncIcon } from '@primer/octicons-react';
import styled, { keyframes } from 'styled-components';
import type { UsageProgress } from '../hooks/useAppUsage';

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: var(--bgColor-muted, #f6f8fa);
  border-radius: 12px;
  margin: 16px 0;
`;

const IconWrapper = styled.div<{ $phase: string }>`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: ${props => props.$phase === 'complete' ? 'var(--bgColor-success-muted, #dafbe1)' : 'var(--bgColor-accent-muted, #ddf4ff)'};
  margin-bottom: 16px;
  
  svg {
    color: ${props => props.$phase === 'complete' ? 'var(--fgColor-success, #1a7f37)' : 'var(--fgColor-accent, #0969da)'};
    animation: ${props => props.$phase === 'fetching' ? spin : props.$phase === 'processing' ? pulse : 'none'} 
               ${props => props.$phase === 'fetching' ? '1s linear infinite' : '1.5s ease-in-out infinite'};
  }
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 24px;
  margin-top: 16px;
  width: 100%;
  max-width: 250px;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const StatValue = styled.span`
  font-size: 24px;
  font-weight: 600;
  color: var(--fgColor-default);
  font-variant-numeric: tabular-nums;
`;

const StatLabel = styled.span`
  font-size: 12px;
  color: var(--fgColor-muted);
  margin-top: 4px;
`;

const Title = styled.div`
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
`;

const Message = styled.div`
  font-size: 14px;
  color: var(--fgColor-muted, #656d76);
  margin-bottom: 12px;
  text-align: center;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const OrgInfo = styled.div`
  font-size: 12px;
  color: var(--fgColor-muted, #656d76);
  margin-bottom: 8px;
`;

const ProgressBarWrapper = styled.div`
  width: 100%;
  max-width: 300px;
  margin-bottom: 16px;
`;

interface Props {
  progress: UsageProgress;
  totalOrgs?: number;
  currentOrgIndex?: number;
}

export function AuditLogProgress({ progress, totalOrgs = 1, currentOrgIndex = 0 }: Props) {
  const getIcon = () => {
    switch (progress.currentPhase) {
      case 'complete':
        return <CheckCircleIcon size={24} />;
      case 'fetching':
        return <SyncIcon size={24} />;
      default:
        return <SearchIcon size={24} />;
    }
  };

  const getProgressPercent = () => {
    if (progress.currentPhase === 'complete') return 100;
    if (progress.totalApps === 0) return 5;
    const percent = (progress.appsChecked / progress.totalApps) * 100;
    return Math.max(5, Math.min(95, percent)); // Clamp between 5 and 95 until complete
  };

  return (
    <Container>
      <IconWrapper $phase={progress.currentPhase}>
        {getIcon()}
      </IconWrapper>
      
      <Title>
        Scanning Audit Logs for apps activity
      </Title>
      
      <Message>
        {progress.message}
      </Message>

      <ProgressBarWrapper>
        <ProgressBar 
          progress={getProgressPercent()} 
          barSize="small"
          aria-label="Audit log scan progress"
        />
      </ProgressBarWrapper>

      {totalOrgs > 1 && (
        <OrgInfo>
          Organization {currentOrgIndex + 1} of {totalOrgs}: <strong>{progress.org}</strong>
        </OrgInfo>
      )}

      <StatsGrid>
        <StatItem>
          <StatValue>{progress.appsChecked}/{progress.totalApps}</StatValue>
          <StatLabel>Apps Checked</StatLabel>
        </StatItem>
        <StatItem>
          <StatValue>{progress.appsFound}</StatValue>
          <StatLabel>Active</StatLabel>
        </StatItem>
      </StatsGrid>
    </Container>
  );
}
