import React, { useState, useEffect } from 'react';
import { Entity, ParentCategory } from '../../types';
import { PlanConfig } from './PlanConfig';
import { FileText, Calculator, Clock, User, Calendar, Activity, TrendingUp, Settings } from 'lucide-react';
import { service } from '../../services';
import { ChangeHistoryEntry } from '../history/ChangeHistory';

interface Props {
    entity: Entity;
    category: ParentCategory;
    onUpdate: () => void;
    onSave?: (newConfig: any) => Promise<void>;
}

export const PlanConfigWithHistory: React.FC<Props> = ({ entity, category, onUpdate, onSave }) => {
    return (
        <div className="space-y-4">
            <PlanConfig
                entity={entity}
                category={category}
                onUpdate={onUpdate}
                onSave={onSave}
            />
        </div>
    );
};
