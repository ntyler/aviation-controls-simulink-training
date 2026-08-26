classdef FCSMode < Simulink.IntEnumType
    %FCSMODE Illustrative flight-control mode codes used by the training assets.
    %
    % This enumeration contains no production or proprietary program data.
    % FlightControlBus.mode intentionally uses uint8 so the referenced-model
    % interface remains simple; this class documents the corresponding codes.

    enumeration
        OFF      (0)
        ARMED    (1)
        ENGAGED  (2)
        DEGRADED (3)
    end

    methods (Static)
        function value = getDefaultValue()
            value = FCSMode.OFF;
        end

        function description = getDescription()
            description = 'Illustrative autopilot modes for Simulink training';
        end

        function tf = addClassNameToEnumNames()
            tf = true;
        end
    end
end
