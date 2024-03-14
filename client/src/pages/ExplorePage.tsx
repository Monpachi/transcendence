import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PublicChannel } from "@api/types/channelsSchema";
import { Spinner } from "../UIKit/Kit";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { SearchRounded } from "@mui/icons-material";
import { useContext, useRef, useState } from "react";
import { ErrorContext } from "../ContextsProviders/ErrorContext";
import { ChannelAvatar } from "../UIKit/avatar/ChannelAvatar";

export const ExplorePage = () => {
  const queryClient = useQueryClient();
  const [filterInput, setFilterInput] = useState("");

  const unfilteredChannels = useRef<PublicChannel[]>();
  const channels = useQuery({
    queryKey: ["publicChannels"],
    queryFn: async () => {
      const res = await axios.get<PublicChannel[]>("/api/channels/public");
      unfilteredChannels.current = res.data;
      return res.data;
    },
  });

  return (
    <div className="flex flex-col p-5 gap-7 w-full items-center text-left">
      <div className="max-w-screen-lg flex flex-col gap-7 w-full h-full">
        <header className="flex flex-col gap-5 justify-center items-center">
          <div className="flex justify-center items-center relative">
            <img src="/explore.svg" alt="" className="h-full w-full" />
            <div className="absolute flex flex-col gap-1 items-center">
              <h1 className="font-extrabold text-4xl">Find your community</h1>
              <span className="opacity-75">
                From gaming, to music, to learning, there's a place for you.
              </span>
            </div>
          </div>

          <label className="bg-black w-[100%] flex justify-between cursor-text has-[:focus]:outline outline-offset-2 has-[:focus]:outline-indigo-500 has-[:focus]:outline-[1px] bg-opacity-30 py-3 px-5 rounded-md">
            <input
              type="text"
              value={filterInput}
              onChange={(e) => {
                setFilterInput(e.target.value);
                queryClient.setQueryData(["publicChannels"], () => {
                  if (!unfilteredChannels.current) return undefined;
                  if (e.target.value === "") return unfilteredChannels.current;
                  return unfilteredChannels.current.filter((c) =>
                    c.name?.toLowerCase().match(e.target.value.toLowerCase())
                  );
                });
              }}
              className="bg-transparent outline-none border-none"
              placeholder="Search channels"
            />
            <SearchRounded />
          </label>
        </header>

        {channels.isError ? (
          <div>{channels.error.message}</div>
        ) : channels.isLoading ? (
          <Spinner isLoading />
        ) : !channels.data?.length ? (
          <span className="opacity-50 text-lg">
            {filterInput === "" ? "No channels yet" : "No results"}
          </span>
        ) : (
          <div className="grid grid-cols-3 gap-5">
            {channels.data.map((channel, i) => {
              return <ChannelCard key={i} channel={channel} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

const ChannelCard = ({ channel }: { channel: PublicChannel }) => {
  const membersCount = channel.membersCount ?? 0;
  const navigate = useNavigate();
  const { addError } = useContext(ErrorContext);
  const queryClient = useQueryClient();

  const joinChannel = useMutation({
    mutationFn: async (channeId: number) => {
      await axios.post(`/api/channels/join/${channeId}`);
      return channeId;
    },
    onSuccess: (channelId) => {
      queryClient.setQueryData(
        ["publicChannels"],
        (prev: PublicChannel[] | undefined) => {
          if (!prev) return undefined;
          return prev.map((c) => {
            if (c.id === channelId) {
              return {
                ...c,
                isMember: true,
              };
            }
            return c;
          });
        }
      );
      navigate(`/home/channels/${channelId}`);
    },
    onError: (error) => {
      addError({ message: error.message });
    },
  });

  return (
    <div className="relative flex flex-col justify-between gap-3 p-5 rounded-lg bg-white bg-opacity-5 shadow-lg overflow-hidden">
      <div className="absolute h-[33%] w-full bg-black bg-opacity-40 -m-5"></div>

      <div className="relative">
        <ChannelAvatar
          borderRadius={0.1}
          imgUrl={channel.photoUrl}
          size="lg"
          id={channel.id}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-col flex-1 overflow-hidden">
          <span className="font-extrabold whitespace-nowrap overflow-hidden text-ellipsis text-xl">
            {channel.name}
          </span>
          <div className="flex gap-1 items-center">
            <span className="opacity-50 text-sm">
              <b>{membersCount}</b> member
              {membersCount !== 1 && "s"}
            </span>
          </div>
        </div>

        {channel.isMember ? (
          <Link
            to={`/home/channels/${channel.id}`}
            className="bg-white hover:translate-y-[-1px] active:translate-y-[0px] bg-opacity-10 rounded-md py-2 px-4 font-bold text-sm self-end"
          >
            Open
          </Link>
        ) : (
          <button
            disabled={joinChannel.isPending}
            onClick={() => joinChannel.mutate(channel.id)}
            className="bg-indigo-500 hover:translate-y-[-1px] active:translate-y-[0px] rounded-md py-2 px-4 font-bold text-sm self-end"
          >
            Join
          </button>
        )}
      </div>
    </div>
  );
};