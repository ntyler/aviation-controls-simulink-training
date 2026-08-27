projectRoot = 'D:\GitHub\aviation-controls-simulink-training';
addpath(fullfile(projectRoot,'scripts'), ...
    fullfile(projectRoot,'models'), fullfile(projectRoot,'data'));

parents = {'ReferencedFlightControlArchitecture','PitchRateLimiter_Harness'};
expectedCounts = [4, 1];

for parentIndex = 1:numel(parents)
    modelName = parents{parentIndex};
    modelFile = fullfile(projectRoot,'models',[modelName '.slx']);
    load_system(modelFile);
    blocks = find_system(modelName, ...
        'LookUnderMasks','all', ...
        'FollowLinks','on', ...
        'BlockType','ModelReference');
    assert(numel(blocks) == expectedCounts(parentIndex), ...
        'Unexpected Model-block count for %s.', modelName);
    for blockIndex = 1:numel(blocks)
        set_param(blocks{blockIndex},'SimulationMode','Normal');
    end
    set_param(modelName,'SimulationCommand','update');
    save_system(modelName);
    close_system(modelName,0);
end

summary = refresh_onboarding_artifacts(projectRoot);
save(fullfile(projectRoot,'results','V8_Refresh_Summary.mat'),'summary');
