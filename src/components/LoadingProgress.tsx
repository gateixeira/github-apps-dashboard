import { ProgressBar } from '@primer/react';
import { OrganizationIcon, AppsIcon, SyncIcon, RepoIcon } from '@primer/octicons-react';
import styled, { keyframes } from 'styled-components';
import type { LoadingProgress as LoadingProgressType } from '../hooks/useDashboardData';

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
  padding: 48px 32px;
`;

const IconWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--bgColor-accent-muted, #ddf4ff);
  margin-bottom: 24px;
  
  svg {
    color: var(--fgColor-accent, #0969da);
    animation: ${spin} 1.5s linear infinite;
  }
`;

const Title = styled.h2`
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 8px 0;
  color: var(--fgColor-default);
`;

const Message = styled.div`
  font-size: 14px;
  color: var(--fgColor-muted, #656d76);
  text-align: center;
  animation: ${pulse} 2s ease-in-out infinite;
  margin-bottom: 24px;
`;

const ProgressWrapper = styled.div`
  width: 100%;
  max-width: 400px;
  margin-bottom: 24px;
`;

const StepsContainer = styled.div`
  display: flex;
  gap: 32px;
  margin-top: 16px;
`;

const Step = styled.div<{ $active: boolean; $complete: boolean }>`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  opacity: ${props => props.$active || props.$complete ? 1 : 0.4};
`;

const StepIcon = styled.div<{ $active: boolean; $complete: boolean }>`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => 
    props.$complete ? 'var(--bgColor-success-muted, #dafbe1)' : 
    props.$active ? 'var(--bgColor-accent-muted, #ddf4ff)' : 
    'var(--bgColor-muted, #f6f8fa)'};
  
  svg {
    color: ${props => 
      props.$complete ? 'var(--fgColor-success, #1a7f37)' : 
      props.$active ? 'var(--fgColor-accent, #0969da)' : 
      'var(--fgColor-muted, #656d76)'};
  }
`;

const StepLabel = styled.span`
  font-size: 12px;
  color: var(--fgColor-muted);
`;

const StepValue = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: var(--fgColor-default);
`;

interface Props {
  progress: LoadingProgressType;
}

export function LoadingProgress({ progress }: Props) {
  const getProgressPercent = () => {
    const phaseWeights: Record<string, number> = {
      organizations: 10,
      installations: 40,
      apps: 70,
      repositories: 90,
      complete: 100,
    };
    
    if (progress.phase === 'complete') return 100;
    
    const basePercent = phaseWeights[progress.phase] || 0;
    
    if (progress.phase === 'installations' && progress.totalOrgs > 0) {
      const orgProgress = (progress.orgsProcessed / progress.totalOrgs) * 30;
      return Math.min(40, 10 + orgProgress);
    }
    
    if (progress.phase === 'apps') {
      return Math.min(70, 40 + (progress.appsLoaded * 2));
    }

    if (progress.phase === 'repositories') {
      return Math.min(95, 70 + (progress.repositoriesLoaded / 10));
    }
    
    return basePercent;
  };

  const isPhaseComplete = (phase: string) => {
    const order = ['organizations', 'installations', 'apps', 'repositories', 'complete'];
    return order.indexOf(phase) < order.indexOf(progress.phase);
  };

  const isPhaseActive = (phase: string) => {
    return phase === progress.phase;
  };

  return (
    <Container>
      <IconWrapper>
        <SyncIcon size={28} />
      </IconWrapper>
      
      <Title>Loading Dashboard</Title>
      
      <Message>
        {progress.message}
      </Message>

      <ProgressWrapper>
        <ProgressBar 
          progress={getProgressPercent()} 
          barSize="default"
          aria-label="Dashboard loading progress"
        />
      </ProgressWrapper>

      <StepsContainer>
        <Step $active={isPhaseActive('organizations')} $complete={isPhaseComplete('organizations')}>
          <StepIcon $active={isPhaseActive('organizations')} $complete={isPhaseComplete('organizations')}>
            <OrganizationIcon size={18} />
          </StepIcon>
          <StepLabel>Organizations</StepLabel>
          {progress.totalOrgs > 0 && <StepValue>{progress.totalOrgs}</StepValue>}
        </Step>

        <Step $active={isPhaseActive('installations')} $complete={isPhaseComplete('installations')}>
          <StepIcon $active={isPhaseActive('installations')} $complete={isPhaseComplete('installations')}>
            <SyncIcon size={18} />
          </StepIcon>
          <StepLabel>Installations</StepLabel>
          {progress.installationsLoaded > 0 && <StepValue>{progress.installationsLoaded}</StepValue>}
        </Step>

        <Step $active={isPhaseActive('apps')} $complete={isPhaseComplete('apps')}>
          <StepIcon $active={isPhaseActive('apps')} $complete={isPhaseComplete('apps')}>
            <AppsIcon size={18} />
          </StepIcon>
          <StepLabel>Apps</StepLabel>
          {progress.appsLoaded > 0 && <StepValue>{progress.appsLoaded}</StepValue>}
        </Step>

        <Step $active={isPhaseActive('repositories')} $complete={isPhaseComplete('repositories')}>
          <StepIcon $active={isPhaseActive('repositories')} $complete={isPhaseComplete('repositories')}>
            <RepoIcon size={18} />
          </StepIcon>
          <StepLabel>Repositories</StepLabel>
          {progress.repositoriesLoaded > 0 && <StepValue>{progress.repositoriesLoaded}</StepValue>}
        </Step>
      </StepsContainer>
    </Container>
  );
}
