import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MessageSquare, Info } from 'lucide-react';
import ServerView from './ServerView';
import ServerAnnouncementThread from './ServerAnnouncementThread';
import ServerMemberList from './ServerMemberList';
import { useGetServerAnnouncements, useUpdatePresence } from '../../hooks/useServerChat';
import { useServerMembersWithProfiles } from '../../hooks/useServerMembers';
import { useInternetIdentity } from '../../hooks/useInternetIdentity';
import type { Server } from '../../backend';

interface ServerChatViewProps {
  server: Server;
  isOwner: boolean;
  pollingInterval: number;
}

export default function ServerChatView({ server, isOwner, pollingInterval }: ServerChatViewProps) {
  const [activeTab, setActiveTab] = useState('chat');
  const { identity } = useInternetIdentity();
  
  const { data: announcements = [], isLoading: announcementsLoading } = useGetServerAnnouncements(
    server.id,
    pollingInterval
  );
  
  const { members, isLoading: membersLoading } = useServerMembersWithProfiles(
    server.id,
    pollingInterval
  );
  
  const updatePresence = useUpdatePresence();

  // Update presence when viewing server
  useEffect(() => {
    const interval = setInterval(() => {
      updatePresence.mutate(true);
    }, 30000); // Every 30 seconds

    // Initial update
    updatePresence.mutate(true);

    return () => clearInterval(interval);
  }, [updatePresence]);

  const currentUserId = identity?.getPrincipal().toString() || null;

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <div className="border-b border-border px-4">
            <TabsList className="h-12">
              <TabsTrigger value="chat" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                Chat
              </TabsTrigger>
              <TabsTrigger value="details" className="gap-2">
                <Info className="h-4 w-4" />
                Server Details
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="chat" className="flex-1 flex flex-col m-0 overflow-hidden">
            <ServerAnnouncementThread
              serverId={server.id}
              serverName={server.name}
              announcements={announcements}
              isLoading={announcementsLoading}
            />
          </TabsContent>

          <TabsContent value="details" className="flex-1 m-0 overflow-auto">
            <ServerView server={server} isOwner={isOwner} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Member List Panel */}
      <ServerMemberList
        serverId={server.id}
        members={members.map(m => ({ principal: m.principal, isActive: m.isActive }))}
        isLoading={membersLoading}
        serverOwnerId={server.owner.toString()}
        currentUserId={currentUserId}
      />
    </div>
  );
}
